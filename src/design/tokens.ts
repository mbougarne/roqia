import colors from '../../design/roqia-v2/tokens/colors.json';
import layout from '../../design/roqia-v2/tokens/layout.json';
import baseTypography from '../../design/roqia-v2/tokens/typography.json';

// Interface sizing follows the screen references; scripture keeps its source font and reader preferences.
export const typography = {
  ...baseTypography,
  roles: {
    ...baseTypography.roles,
    screenTitle: {
      ...baseTypography.roles.screenTitle,
      size: 20,
      lineHeight: 30,
    },
    sectionTitle: {
      ...baseTypography.roles.sectionTitle,
      size: 18,
      lineHeight: 28,
    },
    label: {...baseTypography.roles.label, size: 14, lineHeight: 24},
    bodyStrong: {...baseTypography.roles.bodyStrong, size: 15, lineHeight: 26},
  },
};

export {layout};

export const palettes = {light: colors.light, dark: colors.dark};
