import type { Preview } from "@storybook/react-vite";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "../src/styles.css";
import "../src/pages.css";
import "../src/layout.css";
const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "Oosthoek crème",
      values: [
        { name: "Oosthoek crème", value: "#fffaf1" },
        { name: "Nachtblauw", value: "#0c293d" },
      ],
    },
  },
};
export default preview;
