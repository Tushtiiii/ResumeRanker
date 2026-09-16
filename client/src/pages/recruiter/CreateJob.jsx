import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { jobsAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

export default function CreateJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', company: '', location: 'Remote', description: '', tags: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0]);
    toast.success(`File selected: ${acceptedFiles[0].name}`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1, maxSize: 5 * 1024 * 1024,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description && !file) {
      toast.error('Please enter a job description or upload a file.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      if (file) formData.append('jdFile', file);

      const { data } = await jobsAPI.create(formData);
      setAiResult(data.job.parsedProfile);
      toast.success('Job posted and AI-analyzed! ✨');
      setTimeout(() => navigate(`/recruiter/jobs/${data.job._id}`), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[860px] mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-[2rem] font-bold mb-2 text-[var(--color-text-primary)]">Post a New Job</h1>
          <p className="text-[var(--color-text-secondary)]">
            AI will automatically parse your job description and extract skills, requirements, and seniority.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Basic Info */}
          <div className="card p-7">
            <h2 className="font-heading text-[1.1rem] font-bold mb-5 text-[var(--color-text-primary)]">Basic Information</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {[
                { label: 'Job Title *', key: 'title', placeholder: 'Senior MERN Developer' },
                { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
                { label: 'Location', key: 'location', placeholder: 'Remote / New York, NY' },
                { label: 'Tags (comma-separated)', key: 'tags', placeholder: 'react, node, mongodb' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Job Description */}
          <div className="card p-7">
            <h2 className="font-heading text-[1.1rem] font-bold mb-2 text-[var(--color-text-primary)]">Job Description</h2>
            <p className="text-[var(--color-text-secondary)] text-[13px] mb-5">
              Paste the JD text below <strong>or</strong> upload a PDF/DOCX file. AI will extract skills, experience requirements, and more.
            </p>

            <textarea
              rows={10} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Paste your full job description here..."
              className="input-field resize-y"
            />

            <div className="my-4 text-center text-[var(--color-text-muted)] text-[13px]">— OR UPLOAD A FILE —</div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-[var(--radius-lg)] py-8 px-5 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-[var(--color-accent)] bg-[rgba(124,58,237,0.04)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-4xl mb-2.5">{file ? '✅' : '📄'}</div>
              <p className={`text-sm ${file ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}`}>
                {file ? file.name : isDragActive ? 'Drop your file here' : 'Drag & drop PDF, DOCX, or TXT — or click to browse'}
              </p>
              {file && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2.5 text-[var(--color-danger)] bg-transparent border-none cursor-pointer text-[13px] hover:underline">
                  ✕ Remove file
                </button>
              )}
            </div>
          </div>

          {/* AI Result Preview */}
          {aiResult && (
            <div className="card p-6 border-[rgba(16,185,129,0.4)] bg-[var(--color-success-light)]">
              <h3 className="text-[var(--color-success)] font-heading font-bold mb-4">✨ AI Analysis Complete</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 text-[13px]">
                {aiResult.requiredSkills?.length > 0 && (
                  <div>
                    <div className="text-[var(--color-text-muted)] mb-1.5">Required Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.requiredSkills.map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {aiResult.experienceRange?.label && (
                  <div>
                    <div className="text-[var(--color-text-muted)] mb-1.5">Experience</div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-secondary-light)] border border-[rgba(6,182,212,0.25)] text-[var(--color-secondary)] text-xs font-medium">
                      {aiResult.experienceRange.label}
                    </span>
                  </div>
                )}
                {aiResult.seniorityLevel && (
                  <div>
                    <div className="text-[var(--color-text-muted)] mb-1.5">Seniority</div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-warning-light)] border border-[rgba(245,158,11,0.25)] text-[var(--color-warning)] text-xs font-medium">
                      {aiResult.seniorityLevel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/recruiter')} className="btn-secondary py-3 px-6">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary py-3 px-6 flex-1">
              {loading ? '🤖 AI is analyzing your JD...' : '✨ Post Job & Analyze with AI'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
