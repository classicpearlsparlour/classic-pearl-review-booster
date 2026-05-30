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
            'Option 1 (Detailed & Service-Focused): Focuses on the precision, high technical skill, and excellent quality of the services received. It MUST naturally weave in every single selected service, praise the "salon staff" and "team", and mention the skill of the "stylist".',
            'Option 2 (Luxury, Pampering & Ambience): Focuses on the premium, relaxing, and clean "salon ambience", describing the selected services as part of a high-end pampering session handled by a wonderful "team". It must also praise the "salon staff" and "stylist".',
            'Option 3 (Friendly Staff & Quick Satisfaction): Focuses on the warm hospitality of the "salon staff", the promptness of the "team", and the beautiful "salon ambience", praising the "stylist" who did the work.',
            'Strict Keyword Rules:',
            '- EVERY single review suggestion option MUST explicitly, naturally, and prominently include the four phrases/words: "salon ambience", "salon staff", "team", and "stylist" (or "stylists"). This is mandatory.',
            '- Never list services in a list format (like "services: A, B, C"). Weave them organically into complete, realistic sentences.',
            '- Use simple, conversational, human language. Write as if a real person is writing on their phone.',
            '- Vary the sentence structures across all 3 options. Do not start all drafts the same way.',
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
          'Option 1 (Detailed & Service-Focused): Focuses on the precision, high technical skill, and excellent quality of the services received. It MUST naturally weave in every single selected service, praise the "salon staff" and "team", and mention the skill of the "stylist".',
          'Option 2 (Luxury, Pampering & Ambience): Focuses on the premium, relaxing, and clean "salon ambience", describing the selected services as part of a high-end pampering session handled by a wonderful "team". It must also praise the "salon staff" and "stylist".',
          'Option 3 (Friendly Staff & Quick Satisfaction): Focuses on the warm hospitality of the "salon staff", the promptness of the "team", and the beautiful "salon ambience", praising the "stylist" who did the work.',
          'Strict Keyword Rules:',
          '- EVERY single review suggestion option MUST explicitly, naturally, and prominently include the four phrases/words: "salon ambience", "salon staff", "team", and "stylist" (or "stylists"). This is mandatory.',
          '- Never list services in a list format (like "services: A, B, C"). Weave them organically into complete, realistic sentences.',
          '- Use simple, conversational, human language. Write as if a real person is writing on their phone.',
          '- Vary the sentence structures across all 3 options. Do not start all drafts the same way.',
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
      `Outstanding visit at ${businessName}${maybeLocation}! The salon staff was incredibly welcoming, and my stylist did a fantastic job with my ${servicePhrase}. The entire team was professional, and I loved the clean salon ambience. Highly recommend!`,
    ({ businessName, servicePhrase }) =>
      `Really impressed by the expertise of the team at ${businessName}. My stylist handled my ${servicePhrase} with absolute precision, and the warm salon staff made me feel comfortable throughout. The beautiful salon ambience was an added bonus!`
  ],
  ambience: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `I loved the luxurious salon ambience at ${businessName}${maybeLocation}! I had a ${servicePhrase} here, and the environment felt peaceful and clean. The salon staff is friendly, my stylist was highly skilled, and the entire team is top-tier.`,
    ({ businessName, servicePhrase }) =>
      `The gorgeous salon ambience at ${businessName} makes it the perfect self-care spot. My stylist was wonderful, and the entire salon staff is warm and attentive. The team took such good care of me during my ${servicePhrase}!`
  ],
  hospitality: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `Such a professional team and beautiful salon ambience at ${businessName}${maybeLocation}! The salon staff makes sure you feel pampered. My stylist was incredibly skilled with my ${servicePhrase}.`,
    ({ businessName, servicePhrase }) =>
      `Highly recommend this salon! The salon staff is extremely warm, and the team is prompt and detailed. The wonderful salon ambience combined with the skill of my stylist made my ${servicePhrase} a stellar experience.`
  ]
};

const goodTemplates = {
  service: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `I had a great appointment at ${businessName}${maybeLocation} for ${servicePhrase}. The salon staff was very welcoming, my stylist did a neat job, the team was helpful, and the salon ambience was lovely.`,
    ({ businessName, servicePhrase }) =>
      `My ${servicePhrase} at ${businessName} was handled beautifully. The team is professional, and my stylist did a wonderful job. Excellent service by the salon staff and a great salon ambience!`
  ],
  ambience: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `The salon ambience at ${businessName}${maybeLocation} is clean and peaceful. Had a good experience getting my ${servicePhrase}. The entire team and salon staff are polite, and the stylist did a neat job.`,
    ({ businessName, servicePhrase }) =>
      `Wonderful salon ambience and very comfortable setting at ${businessName}. The salon staff was friendly, the team was quick, and my stylist took care of my ${servicePhrase} beautifully.`
  ],
  hospitality: [
    ({ businessName, servicePhrase, maybeLocation }) =>
      `Friendly and welcoming salon staff at ${businessName}${maybeLocation}! They made my appointment for ${servicePhrase} feel very easy. The team is super accommodating, the salon ambience is great, and my stylist was excellent.`,
    ({ businessName, servicePhrase }) =>
      `Satisfied with the service at ${businessName}. The team was warm, and the salon staff handled my ${servicePhrase} with care. Great salon ambience, professional stylists, and very friendly environment.`
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
