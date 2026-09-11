import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  extractVariables,
  unknownVariables,
} from "@/lib/templateEngine";

describe("templateEngine.renderTemplate", () => {
  it("substitutes known variables (spec §24)", () => {
    const tpl =
      "Dear {{client_name}}, your payment of {{amount}} for {{service_name}} is due on {{due_date}}.";
    const out = renderTemplate(tpl, {
      client_name: "ABC Ltd",
      amount: "৳20,000",
      service_name: "Maintenance",
      due_date: "12 Sep 2026",
    });
    expect(out).toBe(
      "Dear ABC Ltd, your payment of ৳20,000 for Maintenance is due on 12 Sep 2026."
    );
  });

  it("leaves unknown / missing tokens intact", () => {
    expect(renderTemplate("Hi {{client_name}} — {{mystery}}", {})).toBe(
      "Hi {{client_name}} — {{mystery}}"
    );
  });

  it("tolerates whitespace inside tokens and coerces numbers", () => {
    expect(renderTemplate("Total: {{ amount }}", { amount: 5000 })).toBe(
      "Total: 5000"
    );
  });
});

describe("templateEngine variable inspection", () => {
  it("extracts distinct variables", () => {
    expect(
      extractVariables("{{client_name}} {{amount}} {{client_name}}").sort()
    ).toEqual(["amount", "client_name"]);
  });

  it("flags variables outside the catalog", () => {
    expect(unknownVariables("{{client_name}} {{foo}} {{amount}}")).toEqual([
      "foo",
    ]);
  });
});
