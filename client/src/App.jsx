import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, ExternalLink, MessageSquareWarning, QrCode, Sparkles } from 'lucide-react';
import { api } from './api.js';

const emptyBusiness = {
  name: 'Classic Pearls Unisex Salon',
  category: 'Unisex Salon',
  location: '',
  googleReviewLink: 'https://share.google/ANVFFbVH78QgPCRPy',
  servicesText: [
    'Men Haircut: men haircut, haircut, hair salon',
    'Women Haircut: women haircut, ladies haircut, hair styling',
    'Kids Haircut: kids haircut, boys haircut, girls haircut',
    'Hair Color: hair color, hair colouring, salon hair color',
    'Fashion Hair Color: fashion hair color, creative hair color, highlights',
    'Hair Spa: hair spa, deep nourishing spa, damage repair hair spa',
    'Anti Dandruff Hair Spa: anti dandruff spa, hair fall spa, scalp treatment',
    'Keratin Treatment: keratin treatment, smooth hair treatment, hair smoothing',
    'Head Massage: head massage, relaxing massage, head and neck massage',
    'Beard Styling: beard styling, beard color, grooming service',
    'Clean Up: face clean up, herbal clean up, fruit clean up',
    'Facial: facial, gold facial, hydra facial, bridal facial',
    'Threading: eyebrow threading, upper lip threading, face threading',
    'Waxing: rica waxing, full face waxing, brazilian waxing',
    'Manicure: manicure, nail care, cut file polish',
    'Pedicure: pedicure, foot care, de-tan pedicure',
    'Party Makeover: party makeover, styling, makeup service',
    'Bridal Facial: bridal facial, o3 bridal facial, glow facial'
  ].join('\n')
};

export function App() {
  const path = window.location.pathname;
  if (path.startsWith('/r/')) {
    return <CustomerReviewPage businessId={path.split('/r/')[1]} />;
  }
  return <AdminApp />;
}

function AdminApp() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [business, setBusiness] = useState(emptyBusiness);
  const [qr, setQr] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');

  const selectedBusiness = businesses.find((item) => item._id === selectedId);

  async function refresh() {
    const list = await api.listBusinesses();
    setBusinesses(list);
    const nextId = selectedId || list[0]?._id || '';
    setSelectedId(nextId);
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([api.getQr(selectedId), api.getAnalytics(selectedId), api.listComplaints(selectedId)])
      .then(([qrData, analyticsData, complaintsData]) => {
        setQr(qrData);
        setAnalytics(analyticsData);
        setComplaints(complaintsData);
      })
      .catch((error) => setMessage(error.message));
  }, [selectedId]);

  async function createBusiness(event) {
    event.preventDefault();
    setMessage('');
    const payload = {
      ...business,
      services: business.servicesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, keywordText = ''] = line.split(':');
          return {
            name: name.trim(),
            keywords: keywordText
              .split(',')
              .map((keyword) => keyword.trim())
              .filter(Boolean)
          };
        })
    };
    delete payload.servicesText;

    const created = await api.createBusiness(payload);
    setBusiness(emptyBusiness);
    setSelectedId(created._id);
    await refresh();
    setMessage('Business created. QR code is ready.');
  }

  async function updateComplaint(id, status) {
    await api.updateComplaint(id, status);
    setComplaints(await api.listComplaints(selectedId));
    setAnalytics(await api.getAnalytics(selectedId));
  }

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">MVP Dashboard</p>
          <h1>QR AI Review Booster</h1>
          <p className="subtle">Create compliant QR review flows, track conversion, and manage complaints.</p>
        </div>
        <div className="brand-mark">
          <QrCode size={34} />
        </div>
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="admin-grid">
        <form className="panel" onSubmit={createBusiness}>
          <PanelTitle icon={<Building2 />} title="Business Profile" />
          <label>
            Business name
            <input value={business.name} onChange={(event) => setBusiness({ ...business, name: event.target.value })} required />
          </label>
          <label>
            Category
            <input value={business.category} onChange={(event) => setBusiness({ ...business, category: event.target.value })} required />
          </label>
          <label>
            Location
            <input value={business.location} onChange={(event) => setBusiness({ ...business, location: event.target.value })} required />
          </label>
          <label>
            Google review link
            <input
              value={business.googleReviewLink}
              onChange={(event) => setBusiness({ ...business, googleReviewLink: event.target.value })}
              placeholder="https://g.page/r/..."
              required
            />
          </label>
          <label>
            Services and keywords
            <textarea
              value={business.servicesText}
              onChange={(event) => setBusiness({ ...business, servicesText: event.target.value })}
              rows={5}
              required
            />
          </label>
          <button type="submit" className="primary-button">Create business</button>
        </form>

        <section className="panel">
          <PanelTitle icon={<QrCode />} title="QR Code" />
          <label>
            Active business
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {businesses.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </label>
          {qr && (
            <div className="qr-wrap">
              <img src={qr.qrDataUrl} alt="Business QR code" />
              <a href={qr.scanUrl} target="_blank" rel="noreferrer">{qr.scanUrl}</a>
            </div>
          )}
          {!qr && <p className="subtle">Create a business to generate its QR code.</p>}
        </section>
      </section>

      {selectedBusiness && (
        <section className="panel dashboard-panel">
          <PanelTitle icon={<BarChart3 />} title={`${selectedBusiness.name} Analytics`} />
          <div className="metric-grid">
            <Metric label="Total QR scans" value={analytics?.totalQrScans ?? 0} />
            <Metric label="Review option views" value={analytics?.reviewOptionViews ?? 0} />
            <Metric label="Google clicks" value={analytics?.googleReviewButtonClicks ?? 0} />
            <Metric label="Complaints" value={analytics?.feedbackComplaints ?? 0} />
            <Metric label="Conversion rate" value={`${analytics?.conversionRate ?? 0}%`} />
          </div>
        </section>
      )}

      {selectedBusiness && (
        <section className="panel">
          <PanelTitle icon={<MessageSquareWarning />} title="Complaints" />
          <div className="complaint-list">
            {complaints.map((complaint) => (
              <article className="complaint-card" key={complaint._id}>
                <div>
                  <strong>{complaint.serviceName}</strong>
                  <p>{complaint.feedback}</p>
                  <small>{new Date(complaint.createdAt).toLocaleString()}</small>
                </div>
                <select value={complaint.status} onChange={(event) => updateComplaint(complaint._id, event.target.value)}>
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Resolved</option>
                </select>
              </article>
            ))}
            {complaints.length === 0 && <p className="subtle">No complaints yet.</p>}
          </div>
        </section>
      )}
    </main>
  );
}

function CustomerReviewPage({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [serviceId, setServiceId] = useState('');
  const [experience, setExperience] = useState('');
  const [feedback, setFeedback] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedReview, setSelectedReview] = useState('');
  const [complaintSent, setComplaintSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const service = useMemo(() => business?.services.find((item) => item._id === serviceId), [business, serviceId]);

  useEffect(() => {
    api
      .getBusiness(businessId)
      .then((data) => {
        setBusiness(data);
        setServiceId(data.services[0]?._id || '');
        return api.trackScan(businessId);
      })
      .catch((error) => {
        setLoadFailed(true);
        setMessage(error.message);
      });
  }, [businessId]);

  async function generateOptions(nextExperience) {
    setExperience(nextExperience);
    setOptions([]);
    setSelectedReview('');
    setMessage('');

    if (nextExperience === 'not_happy') return;

    setLoading(true);
    try {
      const result = await api.getSuggestions({
        businessId,
        serviceId,
        experience: nextExperience,
        feedback
      });
      setOptions(result.options);
      setSelectedReview(result.options[0]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function postOnGoogle() {
    const result = await api.trackGoogleClick({ businessId, serviceId, selectedReview });
    window.open(result.googleReviewLink, '_blank', 'noopener,noreferrer');
  }

  async function submitComplaint(event) {
    event.preventDefault();
    await api.createComplaint({ businessId, serviceId, feedback });
    setComplaintSent(true);
  }

  if (!business) {
    return (
      <main className="customer-shell">
        <div className="mobile-card">
          {loadFailed ? (
            <>
              <h1>Review page not found</h1>
              <p className="subtle">{message || 'This QR link is not active.'}</p>
              <a className="text-link" href="/">Go to admin dashboard</a>
            </>
          ) : (
            'Loading...'
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="customer-shell">
      <section className="mobile-card">
        <p className="eyebrow">{business.category}</p>
        <h1>{business.name}</h1>
        <p className="subtle">{business.location}</p>

        {message && <div className="notice">{message}</div>}

        <div className="flow-block">
          <label>
            Service used
            <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              {business.services.map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="experience-grid">
          <button className={experience === 'loved' ? 'selected' : ''} onClick={() => generateOptions('loved')}>Loved it</button>
          <button className={experience === 'good' ? 'selected' : ''} onClick={() => generateOptions('good')}>Good</button>
          <button className={experience === 'not_happy' ? 'selected danger' : 'danger'} onClick={() => generateOptions('not_happy')}>Not happy</button>
        </div>

        {loading && <p className="subtle">Creating review options...</p>}

        {options.length > 0 && (
          <section className="review-options">
            <PanelTitle icon={<Sparkles />} title="Choose a Review Draft" />
            {options.map((option) => (
              <button
                className={selectedReview === option ? 'review-option selected' : 'review-option'}
                key={option}
                onClick={() => setSelectedReview(option)}
              >
                {option}
              </button>
            ))}
            <label>
              Edit before posting
              <textarea value={selectedReview} onChange={(event) => setSelectedReview(event.target.value)} rows={5} />
            </label>
            <p className="policy-note">Please post only if this reflects your real experience. Google opens in a new tab.</p>
            <button className="primary-button" onClick={postOnGoogle}>
              <ExternalLink size={18} /> Post on Google
            </button>
          </section>
        )}

        {experience === 'not_happy' && !complaintSent && (
          <form className="feedback-form" onSubmit={submitComplaint}>
            <h2>We’re sorry about your experience.</h2>
            <p className="subtle">Please tell us what went wrong so we can improve.</p>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Tell us what went wrong."
              rows={5}
              required
              minLength={5}
            />
            <button className="primary-button" type="submit">Submit feedback</button>
          </form>
        )}

        {complaintSent && (
          <section className="thank-you">
            <h2>Thank you for the feedback.</h2>
            <p className="subtle">Your message was sent to the business team for follow-up.</p>
            <button className="public-review-link" onClick={postOnGoogle} aria-label="Write a public review">
              <ExternalLink size={15} />
              <span>Write a public review</span>
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

function PanelTitle({ icon, title }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
