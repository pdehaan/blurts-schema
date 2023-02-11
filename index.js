#!/usr/bin/env node

const axios = require("axios");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const CDN_LOGO_BASE = "https://monitor.cdn.mozilla.net/img/logos/";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const properties = {
  AddedDate: { type: "string", format: "date-time" },
  BreachDate: { type: "string", format: "date" },
  DataClasses: { type: "array", items: { type: "string" }, minItems: 1 },
  Description: { type: "string" },
  Domain: { type: "string" },
  IsFabricated: { type: "boolean" },
  IsMalware: { type: "boolean" },
  IsRetired: { type: "boolean" },
  IsSensitive: { type: "boolean" },
  IsSpamList: { type: "boolean" },
  IsVerified: { type: "boolean" },
  LogoPath: { type: "string" },
  LogoUrl: { type: "string", format: "uri" },
  ModifiedDate: { type: "string", format: "date-time" },
  Name: { type: "string" },
  PwnCount: { type: "integer" },
  Title: { type: "string" },
};

const breachSchema = {
  type: "object",
  properties,
  required: Object.keys(properties),
   // TODO: Why does `LogoUrl` only appear in n% of breaches?
  additionalProperties: true,
};

const breachesSchema = {
  $async: true,
  type: "array",
  items: breachSchema,
};

main(20);

async function main(limit = 100) {
  const breaches = await fetchBreaches(limit);
  try {
    const validate = ajv.compile(breachesSchema);
    return validate(breaches);
  } catch (err) {
    const txt = ajv.errorsText(err.errors, { separator: "\n" });
    console.error(txt);
    console.log(`${err.errors.length}/${limit}`);
    process.exitCode = 1;
  }
}

async function fetchBreaches(limit = 1000) {
  const res = await axios.get("https://monitor.firefox.com/hibp/breaches");
  return res.data
    .sort((a, b) => new Date(b.AddedDate) - new Date(a.AddedDate))
    .slice(0, limit)
    .map((breach) => {
      breach.LogoUrl ??= new URL(breach.LogoPath, CDN_LOGO_BASE).href;
      return breach;
    });
}
