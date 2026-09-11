import { SettingModel } from "./setting.model";
import { encrypt, decrypt } from "@/lib/encryption";

const getOrCreate = async () => {
  let setting = await SettingModel.findOne({ key: "global" });
  if (!setting) setting = await SettingModel.create({ key: "global" });
  return setting;
};

/** Strip secrets before returning to any client; expose only "has X" flags. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPublic = (doc: any) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    communication: {
      sms: {
        ...obj.communication.sms,
        api_key: "",
        has_api_key: !!obj.communication.sms.api_key,
      },
      smtp: {
        ...obj.communication.smtp,
        pass: "",
        has_pass: !!obj.communication.smtp.pass,
      },
    },
  };
};

class Service {
  async get() {
    return toPublic(await getOrCreate());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(data: any) {
    const setting = await getOrCreate();

    if (data.company) {
      setting.company = { ...setting.company, ...data.company };
      setting.markModified("company");
    }
    if (data.currency) setting.currency = data.currency;
    if (data.finance) {
      setting.finance = { ...setting.finance, ...data.finance };
      setting.markModified("finance");
    }
    if (data.messaging) {
      setting.messaging = { ...setting.messaging, ...data.messaging };
      setting.markModified("messaging");
    }
    if (data.security) {
      setting.security = { ...setting.security, ...data.security };
      setting.markModified("security");
    }

    if (data.communication) {
      const { sms, smtp } = data.communication;
      if (sms) {
        setting.communication.sms.provider =
          sms.provider ?? setting.communication.sms.provider;
        setting.communication.sms.sender_id =
          sms.sender_id ?? setting.communication.sms.sender_id;
        setting.communication.sms.base_url =
          sms.base_url ?? setting.communication.sms.base_url;
        // Only replace the credential when a new non-empty value is provided.
        if (typeof sms.api_key === "string" && sms.api_key.length > 0) {
          setting.communication.sms.api_key = encrypt(sms.api_key);
        }
      }
      if (smtp) {
        setting.communication.smtp.host =
          smtp.host ?? setting.communication.smtp.host;
        setting.communication.smtp.port =
          smtp.port ?? setting.communication.smtp.port;
        setting.communication.smtp.user =
          smtp.user ?? setting.communication.smtp.user;
        setting.communication.smtp.from_name =
          smtp.from_name ?? setting.communication.smtp.from_name;
        setting.communication.smtp.from_email =
          smtp.from_email ?? setting.communication.smtp.from_email;
        if (typeof smtp.secure === "boolean") {
          setting.communication.smtp.secure = smtp.secure;
        }
        if (typeof smtp.pass === "string" && smtp.pass.length > 0) {
          setting.communication.smtp.pass = encrypt(smtp.pass);
        }
      }
      setting.markModified("communication");
    }

    await setting.save();
    return toPublic(setting);
  }

  /** Internal use only (Phase 5) — returns decrypted SMS credentials. */
  async getSmsCredentials() {
    const setting = await getOrCreate();
    return {
      ...setting.communication.sms,
      api_key: decrypt(setting.communication.sms.api_key),
    };
  }

  /** Internal use only (Phase 5) — returns decrypted SMTP credentials. */
  async getSmtpCredentials() {
    const setting = await getOrCreate();
    return {
      ...setting.communication.smtp,
      pass: decrypt(setting.communication.smtp.pass),
    };
  }

  async getMessagingFlags() {
    const setting = await getOrCreate();
    return setting.messaging;
  }
}

export const SettingService = new Service();
export { toPublic as toPublicSetting };
