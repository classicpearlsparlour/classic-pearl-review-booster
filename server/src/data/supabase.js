import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function requireSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when DATA_MODE=supabase');
  }
}

async function supabaseRequest(path, options = {}) {
  requireSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || 'Supabase request failed');
  }

  return data;
}

function shapeService(service) {
  return {
    id: service._id,
    _id: service._id,
    name: service.name,
    keywords: service.keywords || []
  };
}

function shapeServices(services = []) {
  const shaped = services.map(shapeService);
  Object.defineProperty(shaped, 'id', {
    enumerable: false,
    value: (serviceId) => shaped.find((service) => service._id === serviceId || service.id === serviceId)
  });
  return shaped;
}

function shapeBusiness(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    googleReviewLink: row.google_review_link,
    services: shapeServices(row.services),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function shapeComplaint(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    feedback: row.feedback,
    customerName: row.customer_name || '',
    customerContact: row.customer_contact || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const SupabaseBusiness = {
  async create(payload) {
    const services = payload.services.map((service) => ({
      _id: crypto.randomUUID(),
      name: service.name,
      keywords: service.keywords || []
    }));

    const rows = await supabaseRequest('/businesses', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        category: payload.category,
        location: payload.location,
        google_review_link: payload.googleReviewLink,
        services
      })
    });

    return shapeBusiness(rows[0]);
  },

  find() {
    return {
      async sort() {
        const rows = await supabaseRequest('/businesses?select=*&order=created_at.desc');
        return rows.map(shapeBusiness);
      }
    };
  },

  async findById(id) {
    const rows = await supabaseRequest(`/businesses?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
    return shapeBusiness(rows[0]);
  }
};

export const SupabaseEvent = {
  async create(payload) {
    const rows = await supabaseRequest('/events', {
      method: 'POST',
      body: JSON.stringify({
        business_id: String(payload.businessId),
        type: payload.type,
        metadata: payload.metadata || {}
      })
    });
    return rows[0];
  },

  async aggregate(pipeline) {
    const match = pipeline.find((stage) => stage.$match)?.$match || {};
    const businessId = String(match.businessId || '');
    const rows = await supabaseRequest(
      `/events?business_id=eq.${encodeURIComponent(businessId)}&select=type`
    );
    const counts = rows.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
  }
};

export const SupabaseComplaint = {
  async create(payload) {
    const rows = await supabaseRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        business_id: String(payload.businessId),
        service_id: String(payload.serviceId),
        service_name: payload.serviceName,
        feedback: payload.feedback,
        customer_name: payload.customerName || '',
        customer_contact: payload.customerContact || '',
        status: 'New'
      })
    });
    return shapeComplaint(rows[0]);
  },

  find(query) {
    return {
      async sort() {
        const rows = await supabaseRequest(
          `/complaints?business_id=eq.${encodeURIComponent(String(query.businessId))}&select=*&order=created_at.desc`
        );
        return rows.map(shapeComplaint);
      }
    };
  },

  async findByIdAndUpdate(id, payload) {
    const rows = await supabaseRequest(`/complaints?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: payload.status })
    });
    return shapeComplaint(rows[0]);
  },

  async countDocuments(query) {
    const rows = await supabaseRequest(
      `/complaints?business_id=eq.${encodeURIComponent(String(query.businessId))}&select=id`
    );
    return rows.length;
  }
};
