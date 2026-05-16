import crypto from 'crypto';

const businesses = [];
const events = [];
const complaints = [];

function createId() {
  return crypto.randomBytes(12).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function withDocumentShape(document) {
  return {
    id: document._id,
    ...document
  };
}

function withBusinessShape(document) {
  const services = document.services.map((service) => ({
    id: service._id,
    ...service
  }));

  Object.defineProperty(services, 'id', {
    enumerable: false,
    value: (serviceId) => services.find((service) => service._id === serviceId || service.id === serviceId)
  });

  return withDocumentShape({
    ...document,
    services
  });
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export const MemoryBusiness = {
  async create(payload) {
    const timestamp = now();
    const business = {
      _id: createId(),
      ...payload,
      services: payload.services.map((service) => ({
        _id: createId(),
        ...service
      })),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    businesses.push(business);
    return withBusinessShape(business);
  },

  find() {
    return {
      async sort() {
        return sortByCreatedAtDesc(businesses).map(withBusinessShape);
      }
    };
  },

  async findById(id) {
    const business = businesses.find((item) => item._id === id);
    return business ? withBusinessShape(business) : null;
  }
};

export const MemoryEvent = {
  async create(payload) {
    const timestamp = now();
    const event = {
      _id: createId(),
      ...payload,
      businessId: String(payload.businessId),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    events.push(event);
    return withDocumentShape(event);
  },

  async aggregate(pipeline) {
    const match = pipeline.find((stage) => stage.$match)?.$match || {};
    const businessId = String(match.businessId || '');
    const filtered = events.filter((event) => event.businessId === businessId);
    const counts = filtered.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
  }
};

export const MemoryComplaint = {
  async create(payload) {
    const timestamp = now();
    const complaint = {
      _id: createId(),
      status: 'New',
      ...payload,
      businessId: String(payload.businessId),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    complaints.push(complaint);
    return withDocumentShape(complaint);
  },

  find(query) {
    return {
      async sort() {
        return sortByCreatedAtDesc(
          complaints.filter((complaint) => complaint.businessId === String(query.businessId))
        ).map(withDocumentShape);
      }
    };
  },

  async findByIdAndUpdate(id, payload) {
    const complaint = complaints.find((item) => item._id === id);
    if (!complaint) return null;
    Object.assign(complaint, payload, { updatedAt: now() });
    return withDocumentShape(complaint);
  },

  async countDocuments(query) {
    return complaints.filter((complaint) => complaint.businessId === String(query.businessId)).length;
  }
};
