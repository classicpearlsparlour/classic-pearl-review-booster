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
  const keyword = service.keywords?.[0] || service.name;
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
            'Mention every selected service naturally at least once.',
            'Include salon ambience, professional staff, or friendly environment only as natural wording.',
            'Use simple language and avoid keyword stuffing.',
            'Return only JSON: {"options":["...","...","..."]}.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: business.name,
            category: business.category,
            location: business.location,
            servicesUsed: services.map((item) => item.name),
            naturalKeyword: keyword,
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
  const keyword = service.keywords?.[0] || service.name;

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
          'Mention every selected service naturally at least once.',
          'Include salon ambience, professional staff, or friendly environment only as natural wording.',
          'Use simple language and avoid keyword stuffing.',
          'Return only JSON: {"options":["...","...","..."]}.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({
          businessName: business.name,
          category: business.category,
          location: business.location,
          servicesUsed: services.map((item) => item.name),
          naturalKeyword: keyword,
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
  const keywordPhrase = humanList(
    services.map((item) => item.keywords?.filter(Boolean)?.[0] || item.name)
  );
  const keyword = keywordPhrase || service.name;
  const serviceName = humanList(services.map((item) => item.name.toLowerCase()));
  const businessName = business.name;
  const location = business.location;
  const maybeLocation = location && Math.random() > 0.55 ? ` in ${location}` : '';

  return {
    businessName,
    keyword,
    serviceName,
    location,
    maybeLocation,
    servicePhrase: humanList(serviceNames),
    keywordPhrase,
    smoothPhrase: sample([
      'smooth',
      'easy',
      'simple',
      'well organized',
      'comfortable'
    ]),
    carePhrase: sample([
      'helpful',
      'professional',
      'clear',
      'friendly',
      'patient'
    ]),
    appreciationPhrase: sample([
      'I appreciated the clear communication.',
      'The team made the visit feel easy.',
      'Everything was explained in a simple way.',
      'The service felt careful and professional.',
      'The whole process was handled well.'
    ]),
    salonPhrase: sample([
      'The salon ambience was pleasant and the staff felt professional.',
      'The staff was friendly and the salon environment felt comfortable.',
      'I liked the professional staff and the friendly salon atmosphere.',
      'The salon felt clean, welcoming, and professionally managed.',
      'The friendly environment made the visit feel even better.'
    ])
  };
}

const lovedTemplates = [
  ({ businessName, servicePhrase, keywordPhrase, maybeLocation, smoothPhrase, carePhrase, salonPhrase }) =>
    `I had a great experience with ${servicePhrase} at ${businessName}${maybeLocation}. The ${keywordPhrase} services felt ${smoothPhrase}, and the team was ${carePhrase}. ${salonPhrase}`,
  ({ businessName, serviceName, keywordPhrase, appreciationPhrase, salonPhrase }) =>
    `${businessName} made my ${serviceName} experience really easy. The ${keywordPhrase} services were handled well. ${appreciationPhrase} ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, carePhrase, salonPhrase }) =>
    `Really happy with ${servicePhrase} from ${businessName}. The ${keywordPhrase} experience felt ${carePhrase} and easy to follow. ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, smoothPhrase, salonPhrase }) =>
    `I loved how ${smoothPhrase} the ${servicePhrase} experience was at ${businessName}. The ${keywordPhrase} services felt well managed. ${salonPhrase}`,
  ({ businessName, serviceName, keywordPhrase, carePhrase, salonPhrase }) =>
    `Had a very good ${serviceName} experience with ${businessName}. The ${keywordPhrase} services were ${carePhrase}, and everything felt straightforward. ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, maybeLocation, appreciationPhrase, salonPhrase }) =>
    `Great ${servicePhrase} experience at ${businessName}${maybeLocation}. The ${keywordPhrase} services were easy to recommend. ${appreciationPhrase} ${salonPhrase}`
];

const goodTemplates = [
  ({ businessName, servicePhrase, keywordPhrase, smoothPhrase, salonPhrase }) =>
    `I had a good experience with ${servicePhrase} at ${businessName}. The ${keywordPhrase} services were ${smoothPhrase} and clear. ${salonPhrase}`,
  ({ businessName, serviceName, keywordPhrase, carePhrase, salonPhrase }) =>
    `${businessName} handled my ${serviceName} well. The ${keywordPhrase} services felt ${carePhrase}, and the visit was organized. ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, maybeLocation, salonPhrase }) =>
    `Good service overall from ${businessName}${maybeLocation}. The ${servicePhrase} and ${keywordPhrase} experience was simple and helpful. ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, appreciationPhrase, salonPhrase }) =>
    `My ${servicePhrase} experience with ${businessName} was positive. The ${keywordPhrase} services were handled nicely. ${appreciationPhrase} ${salonPhrase}`,
  ({ businessName, serviceName, keywordPhrase, smoothPhrase, salonPhrase }) =>
    `I had a pleasant ${serviceName} visit at ${businessName}. The ${keywordPhrase} services were ${smoothPhrase} and easy to understand. ${salonPhrase}`,
  ({ businessName, servicePhrase, keywordPhrase, carePhrase, salonPhrase }) =>
    `The ${servicePhrase} at ${businessName} was good. The ${keywordPhrase} services were ${carePhrase}, and the staff handled things well. ${salonPhrase}`
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
