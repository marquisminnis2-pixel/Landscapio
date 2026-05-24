import mongoose, { Document, Schema, Model, Query } from 'mongoose';

// All supported field types
export type CMSFieldType =
  | 'text'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'imageUrl'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'select'
  | 'multiSelect'
  | 'slug'
  | 'reference'
  | 'multiReference';

export interface ICMSFieldSettings {
  // For text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // For number fields
  min?: number;
  max?: number;
  step?: number;

  // For select/multiSelect
  options?: string[];

  // For reference/multiReference
  referenceTo?: string; // collectionId

  // For slug
  sourceField?: string; // fieldId to generate slug from

  // For richText
  allowedFormats?: string[];

  // For imageUrl
  maxSizeKB?: number;
  allowedExtensions?: string[];
}

export interface ICMSField extends Document {
  collectionId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  type: CMSFieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: any;
  settings: ICMSFieldSettings;
  order: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CMSFieldSchema = new Schema<ICMSField>(
  {
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'CMSCollection',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'text',
        'richText',
        'number',
        'boolean',
        'date',
        'datetime',
        'imageUrl',
        'url',
        'email',
        'phone',
        'color',
        'select',
        'multiSelect',
        'slug',
        'reference',
        'multiReference',
      ],
    },
    required: {
      type: Boolean,
      default: false,
    },
    helpText: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    placeholder: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    order: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CMSFieldSchema.index({ collectionId: 1, deletedAt: 1, order: 1 });
CMSFieldSchema.index({ collectionId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Pre-query hook: Exclude soft-deleted fields
CMSFieldSchema.pre(/^find/, function (this: Query<any, ICMSField>, next) {
  const query = this.getQuery();
  if (query.deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-query hook: Require collectionId or _id for security
CMSFieldSchema.pre('find', function (this: Query<any, ICMSField>, next) {
  const query = this.getQuery();
  if (!query.collectionId && !query._id) {
    return next(new Error('CMSField query must include collectionId or _id'));
  }
  next();
});

CMSFieldSchema.pre('findOne', function (this: Query<any, ICMSField>, next) {
  const query = this.getQuery();
  if (!query.collectionId && !query._id) {
    return next(new Error('CMSField query must include collectionId or _id'));
  }
  next();
});

const CMSField: Model<ICMSField> = mongoose.model<ICMSField>('CMSField', CMSFieldSchema);

export default CMSField;
