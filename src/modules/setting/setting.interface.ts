export interface ISetting {
  _id?: string;
  key: string; // always "global" (singleton)
  company: {
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  currency: string; // default BDT
  finance: {
    invoice_prefix: string;
    payment_prefix: string;
    default_payment_terms_days: number;
    payment_methods: string[];
  };
  messaging: {
    sms_enabled: boolean;
    email_enabled: boolean;
  };
  communication: {
    sms: {
      provider: string; // "bulksmsbd"
      api_key: string; // encrypted at rest
      sender_id: string;
      base_url: string;
    };
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string; // encrypted at rest
      from_name: string;
      from_email: string;
      secure: boolean;
    };
  };
  security: {
    session_timeout_minutes: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
