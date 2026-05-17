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
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You generate compliant Google review draft suggestions.',
            'Generate exactly 3 short, natural, human-like options.',
            'Never invent facts, guarantees, rankings, discounts, staff names, or outcomes.',
            'Do not say the business is #1, best, guaranteed, or perfect.',
            'Mention each selected service once in a natural sentence, then talk about the visit.',
            'Do not repeat service names. Do not write keyword lists. Do not sound like SEO copy.',
            'Naturally include one or two ideas from: salon ambience, professional staff, friendly environment.',
            'Use polished but simple language, like a real customer wrote it.',
            'Return only JSON: {"options":["...","...","..."]}.'
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
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content: [
          'You generate compliant Google review draft suggestions.',
          'Generate exactly 3 short, natural, human-like options.',
          'Never invent facts, guarantees, rankings, discounts, staff names, or outcomes.',
          'Do not say the business is #1, best, guaranteed, or perfect.',
          'Mention each selected service once in a natural sentence, then talk about the visit.',
          'Do not repeat service names. Do not write keyword lists. Do not sound like SEO copy.',
          'Naturally include one or two ideas from: salon ambience, professional staff, friendly environment.',
          'Use polished but simple language, like a real customer wrote it.',
          'Return only JSON: {"options":["...","...","..."]}.'
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
  const shuffledTemplates = shuffle(templates);
  const options = [];

  for (const template of shuffledTemplates) {
    const option = template(context);
    if (!options.includes(option)) options.push(option);
    if (options.length === 3) break;
  }

  return normalizeOptions(options, { business, service, feedback });
}

function buildReviewContext({ business, service, services }) {
  const serviceNames = services.map((item) => item.name);
  const servicePhrase = humanList(serviceNames.map((item) => item.toLowerCase()));
  const serviceName = humanList(serviceNames.map((item) => item.toLowerCase()));
  const businessName = business.name;
  const location = business.location;
  const maybeLocation = location && Math.random() > 0.55 ? ` in ${location}` : '';
  const selectedKeyword = sample(pickKeywords(services));

  return {
    businessName,
    serviceName,
    location,
    maybeLocation,
    servicePhrase,
    selectedKeyword,
    opener: sample([
      'I had a really nice visit',
      'My visit felt smooth from start to finish',
      'I had a lovely experience',
      'The whole appointment felt comfortable',
      'I left feeling happy with the visit'
    ]),
    detailPhrase: sample([
      'The staff listened properly and handled everything with care.',
      'The team was professional without making the visit feel rushed.',
      'The service felt neat, calm, and well managed.',
      'The team explained things clearly and kept the experience easy.',
      'Everything felt organized, friendly, and comfortable.'
    ]),
    ambiencePhrase: sample([
      'The salon ambience was clean and welcoming.',
      'The friendly environment made the appointment more relaxing.',
      'The place had a calm salon ambience and a professional feel.',
      'The staff was warm, polite, and professional.',
      'The salon felt comfortable, tidy, and easy to settle into.'
    ]),
    endingPhrase: sample([
      'I would happily visit again.',
      'A good choice for a relaxed salon visit.',
      'It felt like a salon I can trust for regular visits.',
      'Overall, it was a pleasant experience.',
      'I am happy with how the visit turned out.'
    ])
  };
}

const lovedTemplates = [
  ({ businessName, servicePhrase, maybeLocation, opener, detailPhrase, ambiencePhrase, endingPhrase }) =>
    `${opener} at ${businessName}${maybeLocation} for ${servicePhrase}. ${detailPhrase} ${ambiencePhrase} ${endingPhrase}`,
  ({ businessName, servicePhrase, detailPhrase, ambiencePhrase, endingPhrase }) =>
    `${businessName} made my ${servicePhrase} appointment feel easy and well taken care of. ${detailPhrase} ${ambiencePhrase} ${endingPhrase}`,
  ({ businessName, servicePhrase, selectedKeyword, ambiencePhrase, endingPhrase }) =>
    `Really happy with my ${servicePhrase} at ${businessName}. The ${selectedKeyword || 'salon'} experience felt polished, and the team was professional and friendly. ${ambiencePhrase} ${endingPhrase}`,
  ({ businessName, servicePhrase, maybeLocation, detailPhrase, ambiencePhrase }) =>
    `I visited ${businessName}${maybeLocation} for ${servicePhrase}, and the experience felt genuinely comfortable. ${detailPhrase} ${ambiencePhrase}`,
  ({ businessName, servicePhrase, detailPhrase, endingPhrase }) =>
    `Had a great experience at ${businessName} for ${servicePhrase}. ${detailPhrase} The staff was friendly and the salon ambience was pleasant. ${endingPhrase}`,
  ({ businessName, servicePhrase, ambiencePhrase, endingPhrase }) =>
    `Loved the way ${businessName} handled my ${servicePhrase}. ${ambiencePhrase} The professional staff made the visit feel smooth. ${endingPhrase}`
];

const goodTemplates = [
  ({ businessName, servicePhrase, maybeLocation, detailPhrase, ambiencePhrase }) =>
    `I had a good visit to ${businessName}${maybeLocation} for ${servicePhrase}. ${detailPhrase} ${ambiencePhrase}`,
  ({ businessName, servicePhrase, detailPhrase, endingPhrase }) =>
    `${businessName} handled my ${servicePhrase} appointment well. ${detailPhrase} ${endingPhrase}`,
  ({ businessName, servicePhrase, selectedKeyword, ambiencePhrase }) =>
    `Good experience at ${businessName} for ${servicePhrase}. The ${selectedKeyword || 'salon'} visit felt neat and comfortable. ${ambiencePhrase}`,
  ({ businessName, servicePhrase, detailPhrase, ambiencePhrase }) =>
    `My ${servicePhrase} experience with ${businessName} was positive. ${detailPhrase} ${ambiencePhrase}`,
  ({ businessName, servicePhrase, maybeLocation, endingPhrase }) =>
    `I had a pleasant appointment at ${businessName}${maybeLocation} for ${servicePhrase}. The staff was professional and the environment felt friendly. ${endingPhrase}`,
  ({ businessName, servicePhrase, detailPhrase }) =>
    `The ${servicePhrase} at ${businessName} was handled nicely. ${detailPhrase} The salon felt clean, friendly, and professional.`
];

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
