import OpenAI from 'openai';

const positiveTone = {
  loved: 'very positive',
  good: 'positive'
};

export async function generateReviewSuggestions({ business, service, experience, feedback }) {
  if (!['loved', 'good'].includes(experience)) {
    const error = new Error('Review suggestions are only available for positive experiences');
    error.statusCode = 400;
    throw error;
  }

  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI({ business, service, experience, feedback });
  }

  if (process.env.OPENAI_COMPATIBLE_API_KEY && process.env.OPENAI_COMPATIBLE_BASE_URL) {
    return generateWithOpenCompatibleModel({ business, service, experience, feedback });
  }

  return generateFallbackSuggestions({ business, service, experience, feedback });
}

async function generateWithOpenCompatibleModel({ business, service, experience, feedback }) {
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
            serviceUsed: service.name,
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

async function generateWithOpenAI({ business, service, experience, feedback }) {
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
          serviceUsed: service.name,
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

function generateFallbackSuggestions({ business, service, experience, feedback }) {
  const context = buildReviewContext({ business, service });
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

function buildReviewContext({ business, service }) {
  const keyword = sample(service.keywords?.filter(Boolean)) || service.name;
  const serviceName = service.name.toLowerCase();
  const businessName = business.name;
  const location = business.location;
  const maybeLocation = location && Math.random() > 0.55 ? ` in ${location}` : '';

  return {
    businessName,
    keyword,
    serviceName,
    location,
    maybeLocation,
    servicePhrase: sample([
      keyword,
      service.name,
      `${serviceName} service`
    ]),
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
    ])
  };
}

const lovedTemplates = [
  ({ businessName, servicePhrase, maybeLocation, smoothPhrase, carePhrase }) =>
    `I had a great experience with ${servicePhrase} at ${businessName}${maybeLocation}. The process was ${smoothPhrase}, and the team was ${carePhrase}.`,
  ({ businessName, serviceName, appreciationPhrase }) =>
    `${businessName} made my ${serviceName} experience really easy. ${appreciationPhrase}`,
  ({ businessName, keyword, carePhrase }) =>
    `Really happy with the ${keyword} from ${businessName}. The service felt ${carePhrase} and easy to follow.`,
  ({ businessName, servicePhrase, smoothPhrase }) =>
    `I loved how ${smoothPhrase} the ${servicePhrase} experience was at ${businessName}. I felt well taken care of.`,
  ({ businessName, serviceName, carePhrase }) =>
    `Had a very good ${serviceName} experience with ${businessName}. The team was ${carePhrase}, and everything felt straightforward.`,
  ({ businessName, keyword, maybeLocation, appreciationPhrase }) =>
    `Great ${keyword} experience at ${businessName}${maybeLocation}. ${appreciationPhrase}`
];

const goodTemplates = [
  ({ businessName, servicePhrase, smoothPhrase }) =>
    `I had a good experience with ${servicePhrase} at ${businessName}. The process was ${smoothPhrase} and clear.`,
  ({ businessName, serviceName, carePhrase }) =>
    `${businessName} handled my ${serviceName} well. The team was ${carePhrase}, and the visit felt organized.`,
  ({ businessName, keyword, maybeLocation }) =>
    `Good service overall from ${businessName}${maybeLocation}. The ${keyword} experience was simple and helpful.`,
  ({ businessName, servicePhrase, appreciationPhrase }) =>
    `My ${servicePhrase} experience with ${businessName} was positive. ${appreciationPhrase}`,
  ({ businessName, serviceName, smoothPhrase }) =>
    `I had a pleasant ${serviceName} visit at ${businessName}. It was ${smoothPhrase} and easy to understand.`,
  ({ businessName, keyword, carePhrase }) =>
    `The ${keyword} service at ${businessName} was good. The team was ${carePhrase} and handled things well.`
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
