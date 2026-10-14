/* Банер збору. Усе, що треба міняти, — тут. */
(function (root) {
  var FUNDRAISER = {
    on: true,
    image: 'assets/zbir.jpg',
    post: 'https://www.instagram.com/p/DVj_f2VjKgY/',
    jar: 'https://send.monobank.ua/jar/2syPhE9RKF',
    org: '@ngo44700',
    goal: '1 500 000 ₴',
    dismissible: true,

    uk: {
      kicker: 'Збір',
      title: 'Як роса на сонці',
      lead: 'Три НРК «Тарган 7» — наземні дрони з тягою до 500 кг. Возять БК і провізію на позиції та вивозять поранених.',
      who: 'Рота БпС «Чорна вдова», 12 бригада «Азов»',
      goalLabel: 'Ціль',
      donate: 'Задонатити',
      post: 'Про збір',
      bar: 'Збір «Як роса на сонці» — три «Тарган 7» для «Чорної вдови»',
      hide: 'Сховати банер',
      show: 'Показати збір'
    },
    en: {
      kicker: 'Fundraiser',
      title: 'Like dew in the sun',
      lead: 'Three TARHAN 7 ground drones, 500 kg payload each. They carry ammo and supplies to positions and bring the wounded out.',
      who: 'Black Widow UGV company, 12th Azov Brigade',
      goalLabel: 'Goal',
      donate: 'Donate',
      post: 'About it',
      bar: 'Fundraiser: three TARHAN 7 drones for the Black Widow company',
      hide: 'Hide banner',
      show: 'Show fundraiser'
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FUNDRAISER;
  root.FUNDRAISER = FUNDRAISER;
})(typeof globalThis !== 'undefined' ? globalThis : this);
