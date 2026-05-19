import { z } from "zod";
import { useComponent } from "@copilotkit/react-core/v2";
import { WidgetRenderer } from "@/components/widget-renderer";

export const WidgetRendererProps = z.object({
  title: z.string(),
  description: z.string(),
  html: z.string(),
});

export const useGenerativeUI = () => {
  useComponent({
    name: "widgetRenderer",
    description:
      "Renders interactive HTML/SVG visualizations in a sandboxed iframe. " +
      "Use for weather cards, bank dashboards, algorithm visualizations, charts, " +
      "diagrams, interactive widgets, simulations, and any visual explanation. " +
      "The html parameter should be a complete, self-contained HTML fragment with inline CSS and JS.",
    parameters: WidgetRendererProps,
    render: WidgetRenderer,
  });
};
