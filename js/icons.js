/* "Lost things" icons (viewBox 0 0 40 40), hand-drawn with js/hand.js: flat colour sitting a little
   off its inked outline. Used on report chips, as things that fly into the monster's mouth,
   and big + faint in the page backdrop. */
(function () {
  const H = window.Hand;
  const INK = '#34323A';
  const C = H.circ;
  // each icon: list of [pathData, fill|null, strokeWidth]
  const DEFS = {
    train: [['M10 6H30Q34 6 34 10V28Q34 32 30 32H10Q6 32 6 28V10Q6 6 10 6Z', '#8498AE'], ['M11 11H29V19H11Z', '#E8DECB'], [C(13, 26, 2), INK], [C(27, 26, 2), INK], ['M12 33L9 38M28 33L31 38', null]],
    phone: [['M12 3H28Q31 3 31 6V34Q31 37 28 37H12Q9 37 9 34V6Q9 3 12 3Z', '#C98068'], ['M13 8H27V29H13Z', '#E8DECB'], [C(20, 33, 1.5), INK]],
    coffee: [['M9 12H31L28 36H12Z', '#8498AE'], ['M10 19H30L29.2 25H10.8Z', '#E8DECB'], ['M7 9H33V12H7Z', '#E8DECB'], ['M15 7Q12 4 15 2M23 7Q20 4 23 2', null]],
    hourglass: [['M10 4H30C30 14 22 17 22 20C22 23 30 26 30 36H10C10 26 18 23 18 20C18 17 10 14 10 4Z', '#CDAE6B'], ['M8 4H32M8 36H32', null]],
    umbrella: [['M4 21A16 16 0 0 1 36 21Q31 18 28 21Q24 18 20 21Q16 18 12 21Q9 18 4 21Z', '#A98A99'], ['M20 21V32Q20 36 16 36Q13 36 13 33', null]],
    card: [['M4 9H36Q38 9 38 11V29Q38 31 36 31H4Q2 31 2 29V11Q2 9 4 9Z', '#CDAE6B'], ['M2 14H38V19H2Z', INK], ['M7 25H16', null]],
    pizza: [['M20 37L5 9Q20 2 35 9Z', '#CDAE6B'], ['M5 9Q20 2 35 9', null, 4], [C(15, 15, 3), '#B86F5C'], [C(24, 17, 3), '#B86F5C'], [C(20, 26, 2.6), '#B86F5C']],
    bagel: [[C(20, 20, 15), '#C99A62'], [C(20, 20, 5.5), '#EDE6D8'], ['M11 12l2 1M27 11l-1 2M29 24l-2-1M13 29l1-2', null]],
    pigeon: [['M5 26Q7 16 19 16Q29 16 32 22L38 21L34 27Q30 34 19 34Q9 34 5 26Z', '#8E96A3'], [C(29, 14, 5.5), '#7F8895'], [C(30.5, 13, 1.2), INK], ['M34 13L39 15L34 16.5', '#CDAE6B'], ['M11 25Q19 20 26 27', null], ['M16 34L15 39M22 34L23 39', null]],
    hydrant: [['M14 36V16Q14 8 20 8Q26 8 26 16V36Z', '#B86F5C'], ['M12 15H28', null], ['M8 22H14M26 22H32', null, 4], ['M10 36H30', null, 3.5], [C(20, 24, 2), INK]],
    pretzel: [['M20 34C10 34 5 26 8 19C10 12 18 14 20 20C22 14 30 12 32 19C35 26 30 34 20 34Z', '#C99A62'], ['M14 27Q20 20 26 27', null], [C(13, 14, 0.6), INK]],
  };
  const NAMES = Object.keys(DEFS);

  function icon(name, size, extra) {
    const def = DEFS[name] || DEFS.hourglass;
    H.reseed(name.length * 977 + 13);
    const body = def.map((s) => {
      const d = s[0]; const fill = s[1]; const w = s[2] || 2.4;
      return (fill ? H.flat(d, fill, { dx: 1.6, dy: 1.3, amp: 0.7, step: 4 }) : '') + H.line(d, { w, amp: 0.7, step: 4, c: INK });
    }).join('');
    return `<svg class="ico" viewBox="0 0 40 40" width="${size || 40}" height="${size || 40}" stroke-linecap="round" stroke-linejoin="round" ${extra || ''} aria-hidden="true">${body}</svg>`;
  }
  window.Icons = { icon, NAMES, CHIPS: ['train', 'phone', 'coffee', 'hourglass', 'umbrella', 'card', 'pizza', 'bagel'] };
})();
