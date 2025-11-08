document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('vhsMenu');
  const btnClose = document.getElementById('vhsMenuClose');
  const hotspot = document.querySelector('.hotspot-vhs');

  // Открытие меню
  hotspot.addEventListener('click', (e) => {
    e.preventDefault(); // если это <a>, не переходит по ссылке
    menu.classList.add('open');
  });

  // Закрытие меню
  btnClose.addEventListener('click', () => {
    menu.classList.remove('open');
  });
});
