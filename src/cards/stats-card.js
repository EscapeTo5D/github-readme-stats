// @ts-check
import { Card } from "../common/Card.js";
import { I18n } from "../common/I18n.js";
import { icons, rankIcon } from "../common/icons.js";
import {
  CustomError,
  clampValue,
  flexLayout,
  getCardColors,
  kFormatter,
  measureText,
} from "../common/utils.js";
import { statCardLocales } from "../translations.js";

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;
const RANK_ONLY_CARD_MIN_WIDTH = 290;
const RANK_ONLY_CARD_DEFAULT_WIDTH = 290;

/**
 * Create a stats card text item.
 *
 * @param {object} createTextNodeParams Object that contains the createTextNode parameters.
 * @param {string} createTextNodeParams.icon The icon to display.
 * @param {string} createTextNodeParams.label The label to display.
 * @param {number} createTextNodeParams.value The value to display.
 * @param {string} createTextNodeParams.id The id of the stat.
 * @param {string=} createTextNodeParams.unitSymbol The unit symbol of the stat.
 * @param {number} createTextNodeParams.index The index of the stat.
 * @param {boolean} createTextNodeParams.showIcons Whether to show icons.
 * @param {number} createTextNodeParams.shiftValuePos Number of pixels the value has to be shifted to the right.
 * @param {boolean} createTextNodeParams.bold Whether to bold the label.
 * @param {string} createTextNodeParams.number_format The format of numbers on card.
 * @returns {string} The stats card text item SVG object.
 */
const createTextNode = ({
  icon,
  label,
  value,
  id,
  unitSymbol,
  index,
  showIcons,
  shiftValuePos,
  bold,
  number_format,
}) => {
  const kValue =
    number_format.toLowerCase() === "long" ? value : kFormatter(value);
  const staggerDelay = (index + 3) * 150;

  const labelOffset = showIcons ? `x="25"` : "";
  const iconSvg = showIcons
    ? `
    <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
      ${icon}
    </svg>
  `
    : "";
  return `
    <g class="stagger" style="animation-delay: ${staggerDelay}ms" transform="translate(25, 0)">
      ${iconSvg}
      <text class="stat ${
        bold ? " bold" : "not_bold"
      }" ${labelOffset} y="12.5">${label}:</text>
      <text
        class="stat ${bold ? " bold" : "not_bold"}"
        x="${(showIcons ? 140 : 120) + shiftValuePos}"
        y="12.5"
        data-testid="${id}"
      >${kValue}${unitSymbol ? ` ${unitSymbol}` : ""}</text>
    </g>
  `;
};

/**
 * Calculates progress along the boundary of the circle, i.e. its circumference.
 *
 * @param {number} value The rank value to calculate progress for.
 * @returns {number} Progress value.
 */
const calculateCircleProgress = (value) => {
  const radius = 40;
  const c = Math.PI * (radius * 2);

  if (value < 0) {
    value = 0;
  }
  if (value > 100) {
    value = 100;
  }

  return ((100 - value) / 100) * c;
};

/**
 * Retrieves the animation to display progress along the circumference of circle
 * from the beginning to the given value in a clockwise direction.
 *
 * @param {{progress: number}} progress The progress value to animate to.
 * @returns {string} Progress animation css.
 */
const getProgressAnimation = ({ progress }) => {
  return `
    @keyframes rankAnimation {
      from {
        stroke-dashoffset: ${calculateCircleProgress(0)};
      }
      to {
        stroke-dashoffset: ${calculateCircleProgress(progress)};
      }
    }
  `;
};

/**
 * Retrieves CSS styles for a card.
 *
 * @param {Object} colors The colors to use for the card.
 * @param {string} colors.titleColor The title color.
 * @param {string} colors.textColor The text color.
 * @param {string} colors.iconColor The icon color.
 * @param {string} colors.ringColor The ring color.
 * @param {boolean} colors.show_icons Whether to show icons.
 * @param {number} colors.progress The progress value to animate to.
 * @returns {string} Card CSS styles.
 */
const getStyles = ({
  // eslint-disable-next-line no-unused-vars
  titleColor,
  textColor,
  iconColor,
  ringColor,
  show_icons,
  progress,
}) => {
  return `
    .stat {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${textColor};
    }
    @supports(-moz-appearance: auto) {
      /* Selector detects Firefox */
      .stat { font-size:12px; }
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .rank-text {
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textColor};
      animation: scaleInAnimation 0.5s ease-in-out forwards;
      animation-delay: 0ms;
    }
    .rank-percentile-header {
      font-size: 14px;
    }
    .rank-percentile-text {
      font-size: 16px;
    }
    
    .not_bold { font-weight: 400 }
    .bold { font-weight: 700 }
    .icon {
      fill: ${iconColor};
      display: ${show_icons ? "block" : "none"};
    }

    .rank-circle-rim {
      stroke: ${ringColor};
      fill: none;
      stroke-width: 6;
      opacity: 0.2;
      animation-delay: 0ms;
    }
    .rank-circle {
      stroke: ${ringColor};
      stroke-dasharray: 250;
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.8;
      transform-origin: -10px 8px;
      transform: rotate(-90deg);
      animation: rankAnimation 1s forwards ease-in-out;
      animation-delay: 0ms;
    }
    ${process.env.NODE_ENV === "test" ? "" : getProgressAnimation({ progress })}
  `;
};

/**
 * @typedef {import('../fetchers/types').StatsData} StatsData
 * @typedef {import('./types').StatCardOptions} StatCardOptions
 */

/**
 * Renders the stats card.
 *
 * @param {StatsData} stats The stats data.
 * @param {Partial<StatCardOptions>} options The card options.
 * @returns {string} The stats card SVG object.
 */
const renderStatsCard = (stats, options = {}) => {
  const {
    name,
    totalStars,
    totalCommits,
    totalIssues,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage,
    totalReviews,
    totalDiscussionsStarted,
    totalDiscussionsAnswered,
    contributedTo,
    rank,
  } = stats;
  const {
    hide = [],
    show_icons = false,
    hide_title = false,
    hide_border = false,
    card_width,
    hide_rank = false,
    include_all_commits = false,
    line_height = 25,
    title_color,
    ring_color,
    icon_color,
    text_color,
    text_bold = true,
    bg_color,
    theme = "default",
    custom_title,
    border_radius,
    border_color,
    number_format = "short",
    locale,
    disable_animations = false,
    rank_icon = "default",
    show = [],
  } = options;

  const lheight = parseInt(String(line_height), 10);

  // returns theme based colors with proper overrides and defaults
  const { titleColor, iconColor, textColor, bgColor, borderColor, ringColor } =
    getCardColors({
      title_color,
      text_color,
      icon_color,
      bg_color,
      border_color,
      ring_color,
      theme,
    });

  const apostrophe = ["x", "s"].includes(name.slice(-1).toLocaleLowerCase())
    ? ""
    : "s";
  const i18n = new I18n({
    locale,
    translations: statCardLocales({ name, apostrophe }),
  });

  // Meta data for creating text nodes with createTextNode function
  const STATS = {};

  STATS.stars = {
    icon: icons.star,
    label: i18n.t("statcard.totalstars"),
    value: totalStars,
    id: "stars",
  };
  STATS.commits = {
    icon: icons.commits,
    label: `${i18n.t("statcard.commits")}${
      include_all_commits ? "" : ` (${new Date().getFullYear()})`
    }`,
    value: totalCommits,
    id: "commits",
  };
  STATS.prs = {
    icon: icons.prs,
    label: i18n.t("statcard.prs"),
    value: totalPRs,
    id: "prs",
  };

  if (show.includes("prs_merged")) {
    STATS.prs_merged = {
      icon: icons.prs_merged,
      label: i18n.t("statcard.prs-merged"),
      value: totalPRsMerged,
      id: "prs_merged",
    };
  }

  if (show.includes("prs_merged_percentage")) {
    STATS.prs_merged_percentage = {
      icon: icons.prs_merged_percentage,
      label: i18n.t("statcard.prs-merged-percentage"),
      value: mergedPRsPercentage.toFixed(2),
      id: "prs_merged_percentage",
      unitSymbol: "%",
    };
  }

  if (show.includes("reviews")) {
    STATS.reviews = {
      icon: icons.reviews,
      label: i18n.t("statcard.reviews"),
      value: totalReviews,
      id: "reviews",
    };
  }

  STATS.issues = {
    icon: icons.issues,
    label: i18n.t("statcard.issues"),
    value: totalIssues,
    id: "issues",
  };

  if (show.includes("discussions_started")) {
    STATS.discussions_started = {
      icon: icons.discussions_started,
      label: i18n.t("statcard.discussions-started"),
      value: totalDiscussionsStarted,
      id: "discussions_started",
    };
  }
  if (show.includes("discussions_answered")) {
    STATS.discussions_answered = {
      icon: icons.discussions_answered,
      label: i18n.t("statcard.discussions-answered"),
      value: totalDiscussionsAnswered,
      id: "discussions_answered",
    };
  }

  STATS.contribs = {
    icon: icons.contribs,
    label: i18n.t("statcard.contribs"),
    value: contributedTo,
    id: "contribs",
  };

  const longLocales = [
    "cn",
    "es",
    "fr",
    "pt-br",
    "ru",
    "uk-ua",
    "id",
    "ml",
    "my",
    "pl",
    "de",
    "nl",
    "zh-tw",
    "uz",
  ];
  const isLongLocale = locale ? longLocales.includes(locale) : false;

  // filter out hidden stats defined by user & create the text nodes
  const statItems = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key, index) =>
      // create the text nodes, and pass index so that we can calculate the line spacing
      createTextNode({
        icon: STATS[key].icon,
        label: STATS[key].label,
        value: STATS[key].value,
        id: STATS[key].id,
        unitSymbol: STATS[key].unitSymbol,
        index,
        showIcons: show_icons,
        shiftValuePos: 79.01 + (isLongLocale ? 50 : 0),
        bold: text_bold,
        number_format,
      }),
    );

  if (statItems.length === 0 && hide_rank) {
    throw new CustomError(
      "Could not render stats card.",
      "Either stats or rank are required.",
    );
  }

  // Calculate the card height depending on how many items there are
  // but if rank circle is visible clamp the minimum height to `150`
  let height = Math.max(
    45 + (statItems.length + 1) * lheight,
    hide_rank ? 0 : statItems.length ? 150 : 180,
  );

  // the lower the user's percentile the better
  const progress = 100 - rank.percentile;
  const cssStyles = getStyles({
    titleColor,
    ringColor,
    textColor,
    iconColor,
    show_icons,
    progress,
  });

  const calculateTextWidth = () => {
    return measureText(
      custom_title
        ? custom_title
        : statItems.length
          ? i18n.t("statcard.title")
          : i18n.t("statcard.ranktitle"),
    );
  };

  /*
    When hide_rank=true, the minimum card width is 270 px + the title length and padding.
    When hide_rank=false, the minimum card_width is 340 px + the icon width (if show_icons=true).
    Numbers are picked by looking at existing dimensions on production.
  */
  const iconWidth = show_icons && statItems.length ? 16 + /* padding */ 1 : 0;
  const minCardWidth =
    (hide_rank
      ? clampValue(
          50 /* padding */ + calculateTextWidth() * 2,
          CARD_MIN_WIDTH,
          Infinity,
        )
      : statItems.length
        ? RANK_CARD_MIN_WIDTH
        : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;
  const defaultCardWidth =
    (hide_rank
      ? CARD_DEFAULT_WIDTH
      : statItems.length
        ? RANK_CARD_DEFAULT_WIDTH
        : RANK_ONLY_CARD_DEFAULT_WIDTH) + iconWidth;
  let width = card_width
    ? isNaN(card_width)
      ? defaultCardWidth
      : card_width
    : defaultCardWidth;
  if (width < minCardWidth) {
    width = minCardWidth;
  }

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: statItems.length
      ? i18n.t("statcard.title")
      : i18n.t("statcard.ranktitle"),
    width,
    height,
    border_radius,
    colors: {
      titleColor,
      textColor,
      iconColor,
      bgColor,
      borderColor,
    },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(cssStyles);

  if (disable_animations) {
    card.disableAnimations();
  }

  /**
   * Calculates the right rank circle translation values such that the rank circle
   * keeps respecting the following padding:
   *
   * width > RANK_CARD_DEFAULT_WIDTH: The default right padding of 70 px will be used.
   * width < RANK_CARD_DEFAULT_WIDTH: The left and right padding will be enlarged
   *   equally from a certain minimum at RANK_CARD_MIN_WIDTH.
   *
   * @returns {number} - Rank circle translation value.
   */
  const calculateRankXTranslation = () => {
    if (statItems.length) {
      const minXTranslation = RANK_CARD_MIN_WIDTH + iconWidth - 70;
      if (width > RANK_CARD_DEFAULT_WIDTH) {
        const xMaxExpansion = minXTranslation + (450 - minCardWidth) / 2;
        return xMaxExpansion + width - RANK_CARD_DEFAULT_WIDTH;
      } else {
        return minXTranslation + (width - minCardWidth) / 2;
      }
    } else {
      return width / 2 + 20 - 10;
    }
  };

  // Conditionally rendered elements
  const rankCircle = hide_rank
    ? ""
    : `<g data-testid="rank-circle"
          transform="translate(${calculateRankXTranslation()}, ${
            height / 2 - 50
          })">
        <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
        <circle class="rank-circle" cx="-10" cy="8" r="40" />
        <g class="rank-text">
          ${rankIcon(rank_icon, rank?.level, rank?.percentile)}
        </g>
      </g>`;

  // Accessibility Labels
  const labels = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key) => {
      if (key === "commits") {
        return `${i18n.t("statcard.commits")} ${
          include_all_commits ? "" : `in ${new Date().getFullYear()}`
        } : ${STATS[key].value}`;
      }
      return `${STATS[key].label}: ${STATS[key].value}`;
    })
    .join(", ");

  card.setAccessibilityLabel({
    title: `${card.title}, Rank: ${rank.level}`,
    desc: labels,
  });

  return card.render(`
    ${rankCircle}
    <svg x="0" y="0">
      ${flexLayout({
        items: statItems,
        gap: lheight,
        direction: "column",
      }).join("")}
    </svg>
  `);
};

export { renderStatsCard };
export default renderStatsCard;
