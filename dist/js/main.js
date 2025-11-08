document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('vhsMenu');
  const btnClose = document.getElementById('vhsMenuClose');
  const hotspot = document.querySelector('.hotspot-vhs');

  // Переключение меню по клику на коробку
  hotspot.addEventListener('click', (e) => {
    e.preventDefault();
    menu.classList.toggle('open');
  });

  // Принудительное закрытие по клику на кнопку
  btnClose.addEventListener('click', (e) => {
    e.stopPropagation(); // предотвращает "всплытие" и повторный триггер
    menu.classList.remove('open');
  });
});
