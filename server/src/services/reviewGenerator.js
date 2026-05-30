import OpenAI from 'openai';

const positiveTone = {
  loved: 'very positive',
  good: 'positive'
};

export async function generateReviewSuggestions({ business, service, services, experience, feedback }) {
  const selectedServices = services?.length ? services : [service].filter(Boolean);
  const reviewService = combineServices(selectedServices);

  if (!['loved', 'good'].includes(experience)) {
    const error = new Error('Review suggestions are only available for positive experiences');
    error.statusCode = 400;
    throw error;
  }

  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI({ business, service: reviewService, services: selectedServices, experience, feedback });
  }

  if (process.env.OPENAI_COMPATIBLE_API_KEY && process.env.OPENAI_COMPATIBLE_BASE_URL) {
    return generateWithOpenCompatibleModel({ business, service: reviewService, services: selectedServices, experience, feedback });
  }

  return generateFallbackSuggestions({ business, service: reviewService, services: selectedServices, experience, feedback });
}

async function generateWithOpenCompatibleModel({ business, service, services, experience, feedback }) {
  const serviceNames = services.map((item) => item.name);
  const keywords = pickKeywords(services);
  const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL.replace(/\/$/, '');
  const model = process.env.OPENAI_COMPATIBLE_MODEL || 'llama-3.1-8b-instant';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_COMPATIBLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert copywriter helping salon clients write authentic, natural-sounding Google reviews.',
            'Generate exactly 3 completely distinct review options based on the user inputs, each written from a different customer perspective/style:',
            'Option 1 (Detailed & Service-Focused): Focuses on the precision, high technical skill, and excellent quality of the services received. It MUST naturally weave in every single selected service.',
            'Option 2 (Luxury, Pampering & Ambience): Focuses on the premium, relaxing, and clean atmosphere of the salon, describing the selected services as part of a high-end pampering session.',
            'Option 3 (Friendly Staff & Quick Satisfaction): Focuses on the warm hospitality, friendliness of the team, prompt service, and great overall satisfaction with the results.',
            'Strict Spam Prevention and Naturalness Guidelines:',
            '- Never list services in a list format (like "services: A, B, C"). Weave them organically into complete, realistic sentences.',
            '- Use simple, conversational, human language. Write as if a real person is writing on their phone (do not sound like a marketing agency or SEO keyword-stuffed copy).',
            '- Vary the sentence structures across all 3 options. Do not start all drafts the same way (avoid starting every draft with "I visited...").',
            '- Absolutely DO NOT use cheesy, promotional words like "perfectly", "guaranteed", "flawless", "number one", "#1", or "best ever" which trigger Google spam detection filters.',
            '- Do not invent staff names, prices, or promotions.',
            'Return ONLY JSON in this format: {"options": ["Option 1 text", "Option 2 text", "Option 3 text"]}.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: business.name,
            category: business.category,
            location: business.location,
            servicesUsed: serviceNames,
            naturalKeywordsToUseSparingly: keywords,
            experienceTone: positiveTone[experience],
            optionalCustomerFeedback: feedback || ''
          })
        }
      ]
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'AI provider request failed');
  }

  const parsed = JSON.parse(result.choices[0].message.content);
  return normalizeOptions(parsed.options, { business, service, feedback });
}

async function generateWithOpenAI({ business, service, services, experience, feedback }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const serviceNames = services.map((item) => item.name);
  const keywords = pickKeywords(services);

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.85,
    messages: [
      {
        role: 'system',
        content: [
          'You are an expert copywriter helping salon clients write authentic, natural-sounding Google reviews.',
          'Generate exactly 3 completely distinct review options based on the user inputs, each written from a different customer perspective/style:',
          'Option 1 (Detailed & Service-Focused): Focuses on the precision, high technical skill, and excellent quality of the services received. It MUST naturally weave in every single selected service.',
          'Option 2 (Luxury, Pampering & Ambience): Focuses on the premium, relaxing, and clean atmosphere of the salon, describing the selected services as part of a high-end pampering session.',
          'Option 3 (Friendly Staff & Quick Satisfaction): Focuses on the warm hospitality, friendliness of the team, prompt service, and great overall satisfaction with the results.',
          'Strict Spam Prevention and Naturalness Guidelines:',
          '- Never list services in a list format (like "services: A, B, C"). Weave them organically into complete, realistic sentences.',
          '- Use simple, conversational, human language. Write as if a real person is writing on their phone (do not sound like a marketing agency or SEO keyword-stuffed copy).',
          '- Vary the sentence structures across all 3 options. Do not start all drafts the same way (avoid starting every draft with "I visited...").',
          '- Absolutely DO NOT use cheesy, promotional words like "perfectly", "guaranteed", "flawless", "number one", "#1", or "best ever" which trigger Google spam detection filters.',
          '- Do not invent staff names, prices, or promotions.',
          'Return ONLY JSON in this format: {"options": ["Option 1 text", "Option 2 text", "Option 3 text"]}.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({
          businessName: business.name,
          category: business.category,
          location: business.location,
          servicesUsed: serviceNames,
          naturalKeywordsToUseSparingly: keywords,
          experienceTone: positiveTone[experience],
          optionalCustomerFeedback: feedback || ''
        })
      }
    ],
    response_format: { type: 'json_object' }
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  return normalizeOptions(parsed.options, { business, service, feedback });
}

function generateFallbackSuggestions({ business, service, services, experience, feedback }) {
  const context = buildReviewContext({ business, service, services });
  const templates = experience === 'loved' ? lovedTemplates : goodTemplates;
  
  // Pick one random template from each style group to guarantee 3 highly distinct review suggestions
  const option1 = sample(templates.service)(context);
  const option2 = sample(templates.ambience)(context);
  const option3 = sample(templates.hospitality)(context);
  
  return normalizeOptions([option1, option2, option3], { business, service, feedback });
}

function buildReviewContext({ business, service, services }) {
  const serviceNames = services.map((item) => item.name);
  const servicePhrase = humanList(serviceNames.map((item) => item.toLowerCase()));
  const businessName = business.name;
  const location = business.location;
  const maybeLocation = location && Math.random() > 0.55 ? ` in ${location}` : '';
  const selectedKeyword = sample(pickKeywords(services));

  return {
    businessName,
    location,
    maybeLocation,
    servicePhrase,
    selectedKeyword
  };
}

const lovedTemplates = {
  service: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `Had a wonderful experience at ${businessName}${maybeLocation} for my ${servicePhrase}. The team paid close attention to exactly what I wanted. The quality is clear and the overall service felt highly detailed and professional.`,
    ({ businessName, servicePhrase }) =>
      `Really impressed with my ${servicePhrase} at ${businessName}. The technical skill is obvious and they didn't rush through the appointment. It was a solid, detailed service that turned out exactly how I hoped.`
  ],
  ambience: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `${businessName}${maybeLocation} has such a clean, relaxing space. I had a ${servicePhrase} here and felt completely pampered from start to finish. The calm, tranquil salon ambience makes it the perfect self-care spot.`,
    ({ businessName, servicePhrase }) =>
      `Love the warm and welcoming feel of ${businessName}. My ${servicePhrase} visit was so relaxing. The environment is peaceful, clean, and comfortable, making the whole appointment feel like a treat.`
  ],
  hospitality: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `Such a friendly and professional team at ${businessName}${maybeLocation}! They made my appointment for ${servicePhrase} feel easy and comfortable. Everyone was super welcoming and took great care of me.`,
    ({ businessName, servicePhrase }) =>
      `Highly recommend ${businessName} for any salon service. The staff is warm and attentive, handling my ${servicePhrase} with absolute care. They are prompt, accommodating, and very pleasant to deal with.`
  ]
};

const goodTemplates = {
  service: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `I had a good appointment at ${businessName}${maybeLocation} for ${servicePhrase}. They were very professional and did a neat job.`,
    ({ businessName, servicePhrase }) =>
      `My ${servicePhrase} at ${businessName} was handled nicely. The service was clear and they did exactly what I requested.`
  ],
  ambience: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `The salon at ${businessName}${maybeLocation} is clean and organized. I had a pleasant experience getting my ${servicePhrase}.`,
    ({ businessName, servicePhrase }) =>
      `Nice and tidy space at ${businessName}. My ${servicePhrase} appointment was comfortable and peaceful.`
  ],
  hospitality: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `Friendly service at ${businessName}${maybeLocation} for ${servicePhrase}. The staff is polite and made sure I had everything I needed.`,
    ({ businessName, servicePhrase }) =>
      `Satisfied with the customer service at ${businessName}. They handled my ${servicePhrase} with care and made the visit easy.`
  ]
};

function normalizeOptions(options, { business, service }) {
  const cleaned = (Array.isArray(options) ? options : [])
    .map((option) => String(option).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((option) => !/#1|number one|guarantee|guaranteed/i.test(option))
    .slice(0, 3);

  while (cleaned.length < 3) {
    cleaned.push(`I had a good experience with ${service.name} at ${business.name}. The service was clear and helpful.`);
  }

  return cleaned.slice(0, 3);
}

function combineServices(services) {
  const names = services.map((service) => service.name);
  const keywords = services
    .flatMap((service) => service.keywords?.filter(Boolean) || [service.name])
    .slice(0, 6);

  return {
    id: services.map((service) => service.id || service._id).join(','),
    _id: services.map((service) => service.id || service._id).join(','),
    name: humanList(names),
    keywords
  };
}

function pickKeywords(services) {
  return services
    .map((service) => service.keywords?.find(Boolean) || service.name)
    .filter(Boolean)
    .slice(0, 4);
}

function humanList(items) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function trimSentence(value) {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function sample(items) {
  if (!items?.length) return '';
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
