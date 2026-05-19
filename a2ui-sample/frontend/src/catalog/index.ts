import { basicCatalog } from "@a2ui/react/v0_9";
import { Catalog } from "@a2ui/web_core/v0_9";
import type { ReactComponentImplementation } from "@a2ui/react/v0_9";
import { WeatherCard, BankAccountCard } from "./components";

// Create a new catalog that includes basic + custom components
const allComponents = [
  ...Array.from(basicCatalog.components.values()),
  WeatherCard,
  BankAccountCard,
];

export const customCatalog = new Catalog<ReactComponentImplementation>(
  "custom",
  allComponents,
  Array.from(basicCatalog.functions.values()),
);
