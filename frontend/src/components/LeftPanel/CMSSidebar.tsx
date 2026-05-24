import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCMSStore } from '@/store/useCMSStore';
import { COLLECTION_TEMPLATES } from '@/types/cms.types';

const ECOMMERCE_SLUGS = ['products', 'categories', 'discounts', 'orders', 'subscriptions'];

const ECOMMERCE_TEMPLATES: Record<string, { name: string; fields: any[] }> = {
  products: COLLECTION_TEMPLATES['products'],
  categories: {
    name: 'Categories',
    fields: [
      { name: 'Name', slug: 'name', type: 'text', required: true },
      { name: 'Slug', slug: 'slug', type: 'slug', required: true },
      { name: 'Description', slug: 'description', type: 'text', required: false },
      { name: 'Image', slug: 'image', type: 'imageUrl', required: false },
    ],
  },
  discounts: {
    name: 'Discounts',
    fields: [
      { name: 'Code', slug: 'code', type: 'text', required: true },
      { name: 'Discount (%)', slug: 'discount-percent', type: 'number', required: true },
      { name: 'Active', slug: 'active', type: 'boolean', required: false, defaultValue: true },
      { name: 'Expires', slug: 'expires', type: 'date', required: false },
    ],
  },
  orders: {
    name: 'Orders',
    fields: [
      { name: 'Order ID', slug: 'order-id', type: 'text', required: true },
      { name: 'Customer', slug: 'customer', type: 'text', required: true },
      { name: 'Total', slug: 'total', type: 'number', required: true },
      { name: 'Status', slug: 'status', type: 'select', required: false },
      { name: 'Date', slug: 'date', type: 'datetime', required: false },
    ],
  },
  subscriptions: {
    name: 'Subscriptions',
    fields: [
      { name: 'Customer', slug: 'customer', type: 'text', required: true },
      { name: 'Plan', slug: 'plan', type: 'select', required: true },
      { name: 'Status', slug: 'status', type: 'select', required: false },
      { name: 'Start Date', slug: 'start-date', type: 'date', required: false },
      { name: 'Next Billing', slug: 'next-billing', type: 'date', required: false },
    ],
  },
};

interface CMSSidebarProps {
  onSelectCollection: (id: string) => void;
  selectedCollectionId: string | null;
}

export default function CMSSidebar({ onSelectCollection, selectedCollectionId }: CMSSidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { collections, loadCollections, createCollection, isLoading } = useCMSStore();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandCMS, setExpandCMS] = useState(true);
  const [expandEcom, setExpandEcom] = useState(true);
  const [settingUp, setSettingUp] = useState<string | null>(null);
  const hasBoostrapped = useRef(false);

  useEffect(() => {
    if (projectId) loadCollections();
  }, [projectId]);

  // Auto-create Blog Posts if no collections exist yet
  useEffect(() => {
    if (hasBoostrapped.current) return;
    if (isLoading) return;
    if (!projectId) return;
    hasBoostrapped.current = true;

    const hasBlogPosts = collections.some(
      (c) => c.name === 'Blog Posts' || c.slug === 'blog-posts'
    );
    if (!hasBlogPosts && collections.length === 0) {
      const tmpl = COLLECTION_TEMPLATES['blog-posts'];
      createCollection(tmpl.name, undefined, tmpl.fields);
    }
  }, [isLoading, collections.length]);

  const cmcCollections = collections.filter(
    (c) => !ECOMMERCE_SLUGS.includes(c.slug)
  );
  const ecomCollections = ECOMMERCE_SLUGS.map((slug) => ({
    slug,
    collection: collections.find((c) => c.slug === slug),
    template: ECOMMERCE_TEMPLATES[slug],
  }));

  const handleCreateCustom = async () => {
    const name = newName.trim();
    if (!name) return;
    setShowNewInput(false);
    setNewName('');
    const col = await createCollection(name);
    if (col) onSelectCollection(col._id);
  };

  const handleSetupEcom = async (slug: string) => {
    const tmpl = ECOMMERCE_TEMPLATES[slug];
    if (!tmpl) return;
    setSettingUp(slug);
    const col = await createCollection(tmpl.name, undefined, tmpl.fields);
    setSettingUp(null);
    if (col) onSelectCollection(col._id);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto text-sm">
      {/* CMS COLLECTIONS */}
      <div className="border-b border-border-color">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setExpandCMS(!expandCMS)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/60 hover:text-white/80"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expandCMS ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            CMS Collections
          </button>
          <button
            onClick={() => setShowNewInput(true)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-canvas-bg text-white/40 hover:text-[#34D399] transition-colors"
            title="New collection"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {expandCMS && (
          <div className="pb-2">
            {cmcCollections.map((col) => (
              <button
                key={col._id}
                onClick={() => onSelectCollection(col._id)}
                className={`w-full flex items-center justify-between px-4 py-1.5 text-left transition-colors ${
                  selectedCollectionId === col._id
                    ? 'bg-canvas-bg text-[#34D399]'
                    : 'text-text-secondary hover:bg-canvas-bg hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="truncate text-xs">{col.name}</span>
                </div>
                {col.itemCount !== undefined && (
                  <span className="text-[10px] text-white/30 flex-shrink-0 ml-1">{col.itemCount}</span>
                )}
              </button>
            ))}

            {showNewInput ? (
              <div className="px-3 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCustom();
                    if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
                  }}
                  onBlur={() => { if (!newName.trim()) { setShowNewInput(false); } }}
                  placeholder="Collection name..."
                  className="w-full px-2 py-1 text-xs bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-[#34D399]"
                />
              </div>
            ) : cmcCollections.length === 0 && !isLoading ? (
              <p className="px-4 py-2 text-[11px] text-white/30 italic">No collections yet</p>
            ) : null}
          </div>
        )}
      </div>

      {/* ECOMMERCE */}
      <div>
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setExpandEcom(!expandEcom)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/60 hover:text-white/80"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expandEcom ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Ecommerce
          </button>
          <button
            onClick={() => { setExpandEcom(true); setShowNewInput(true); }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-canvas-bg text-white/40 hover:text-[#34D399] transition-colors"
            title="New e-commerce collection"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {expandEcom && (
          <div className="pb-2">
            {ecomCollections.map(({ slug, collection, template }) => {
              const exists = !!collection;
              const isSettingUp = settingUp === slug;
              return (
                <button
                  key={slug}
                  onClick={() => exists ? onSelectCollection(collection!._id) : handleSetupEcom(slug)}
                  disabled={isSettingUp}
                  className={`w-full flex items-center justify-between px-4 py-1.5 text-left transition-colors group ${
                    exists && selectedCollectionId === collection!._id
                      ? 'bg-canvas-bg text-[#34D399]'
                      : exists
                      ? 'text-text-secondary hover:bg-canvas-bg hover:text-text-primary'
                      : 'text-white/25 hover:text-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="truncate text-xs">{template.name}</span>
                    {!exists && (
                      <span className="text-[9px] text-white/20 group-hover:text-[#34D399]/60 transition-colors">
                        {isSettingUp ? 'setting up...' : 'set up'}
                      </span>
                    )}
                  </div>
                  {exists && collection!.itemCount !== undefined && (
                    <span className="text-[10px] text-white/30 flex-shrink-0 ml-1">{collection!.itemCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}