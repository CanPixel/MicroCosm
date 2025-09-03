// HSL color values as [Hue, Saturation, Lightness]
type HSLColor = [number, number, number];

type ColorTheme = {
  background: HSLColor;
  primary: HSLColor;
  accent: HSLColor;
};

// The theme the game starts with
export const THEME_CALM: ColorTheme = {
  background: [224, 71, 4], // Dark Blue: #050E18
  primary: [198, 93, 60], // Light Blue: #55D9F8
  accent: [263, 90, 58], // Purple: #6E3FF4
};

// The theme the game transitions to as the cell grows
export const THEME_VIBRANT: ColorTheme = {
  background: [265, 38, 16], // Dark Purple: #321F4C
  primary: [36, 100, 50],  // Orange: #FF9900
  accent: [328, 81, 59],   // Pink: #E839B2
};
