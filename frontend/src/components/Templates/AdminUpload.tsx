
import { useState } from 'react';
import { uploadTemplate } from '@/api/templates';

const AdminUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('');

  const onUpload = async () => {
    if (!file) return setStatus('Select a file');
    setStatus('Uploading...');
    try {
      const res = await uploadTemplate(file, name || file.name, tags.split(',').map(s => s.trim()));
      setStatus('Uploaded: ' + res.id);
    } catch (err: any) {
      setStatus('Error: ' + (err.message || 'upload failed'));
    }
  };

  return (
    <div className="p-4 border border-border-color rounded bg-panel-bg">
      <h4 className="mb-2 font-semibold">Admin: Upload Template ZIP</h4>
      <input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <input className="mt-2 w-full" placeholder="Optional name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="mt-2 w-full" placeholder="tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <button className="px-3 py-2 bg-accent-blue text-white rounded" onClick={onUpload}>Upload</button>
        <div className="text-sm text-text-secondary self-center">{status}</div>
      </div>
    </div>
  );
};

export default AdminUpload;
