const ICONS = {
    square: '<rect x="4" y="4" width="16" height="16" rx="3.5" stroke="currentColor" stroke-width="1.6"/>',
    circle: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/>',
    triangle: '<path d="M12 3l8 15H4l8-15z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    star: '<path d="M12 2l3 6.5 7 1-5 5 1.5 7L12 18l-6.5 3.5L7 14.5l-5-5 7-1L12 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    bars: '<path d="M4 12h16M4 6h16M4 18h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>',
    shield: '<path d="M12 2.5l7.5 3v6c0 5-3.2 8.7-7.5 10-4.3-1.3-7.5-5-7.5-10v-6l7.5-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    hexagon: '<path d="M12 2.5l8 4.6v9.8L12 21.5l-8-4.6V7.1L12 2.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
};

function iconSvg(shape, size = 24) {
    const inner = ICONS[shape] || ICONS.square;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">${inner}</svg>`;
}

module.exports = { iconSvg };
