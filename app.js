const { createApp } = Vue;

createApp({
  data() {
    return {
      currentPage: 'lessons',   // which page is showing: lessons, teachers or cart
      searchText: '',           // what the user types in the search box
      sortBy: 'subject',        // attribute to sort by
      sortOrder: 'asc',         // asc or desc
      cart: [],                 // items added: { id, subject, location, price, icon, quantity }
      customerName: '',         // checkout form
      customerPhone: '',
      orderPlaced: false,       // true after checkout, shows the confirmation message
      lastOrder: null,          // summary of the order just placed
      toastMessage: '',         // text shown in the popup ('' means hidden)
      toastTimer: null,         // remembers the timer so we can reset it
      lessons: [
        { id: 1, subject: 'Maths Tuition', location: 'Rose Hill', price: 800, spaces: 5, icon: 'fa-solid fa-calculator' },
        { id: 2, subject: 'Sega Dance', location: 'Curepipe', price: 600, spaces: 5, icon: 'fa-solid fa-music' },
        { id: 3, subject: 'Swimming', location: 'Quatre Bornes', price: 900, spaces: 5, icon: 'fa-solid fa-person-swimming' },
        { id: 4, subject: 'French Classes', location: 'Port Louis', price: 700, spaces: 5, icon: 'fa-solid fa-language' },
        { id: 5, subject: 'Football', location: 'Vacoas', price: 500, spaces: 5, icon: 'fa-solid fa-futbol' },
        { id: 6, subject: 'Art Club', location: 'Moka', price: 650, spaces: 5, icon: 'fa-solid fa-palette' },
        { id: 7, subject: 'Chess', location: 'Rose Hill', price: 450, spaces: 5, icon: 'fa-solid fa-chess' },
        { id: 8, subject: 'Robotics', location: 'Ebene', price: 1200, spaces: 5, icon: 'fa-solid fa-robot' },
        { id: 9, subject: 'Creole Heritage', location: 'Grand Baie', price: 550, spaces: 5, icon: 'fa-solid fa-book-open' },
        { id: 10, subject: 'Piano', location: 'Flic en Flac', price: 1000, spaces: 5, icon: 'fa-solid fa-music' }
      ]
    };
  },

  computed: {
    // Total number of spaces in the cart (adds up every quantity)
    cartCount() {
      return this.cart.reduce((total, item) => total + item.quantity, 0);
    },

    // Total price of everything in the cart
    cartTotal() {
      return this.cart.reduce((total, item) => total + item.price * item.quantity, 0);
    },

    // Validation with regular expressions
    // ^ and $ mean the WHOLE text must match, + means one or more characters
    nameValid() {
      return /^[A-Za-z]+( [A-Za-z]+)*$/.test(this.customerName.trim());   // letters and single spaces only
    },
    phoneValid() {
      return /^[0-9]{7,15}$/.test(this.customerPhone.trim());             // digits only, 7 to 15 long
    },
    // Checkout button is enabled only when both are valid
    canCheckout() {
      return this.nameValid && this.phoneValid && this.cart.length > 0;
    },

    // The lessons actually shown: first filtered by search, then sorted.
    // Vue re-runs this automatically whenever searchText, sortBy, sortOrder or lessons change.
    visibleLessons() {
      const text = this.searchText.trim().toLowerCase();

      const filtered = this.lessons.filter(lesson => {
        if (text === '') return true;
        return (
          lesson.subject.toLowerCase().includes(text) ||
          lesson.location.toLowerCase().includes(text) ||
          String(lesson.price).includes(text) ||
          String(lesson.spaces).includes(text)
        );
      });

      const key = this.sortBy;
      const direction = this.sortOrder === 'asc' ? 1 : -1;

      return [...filtered].sort((a, b) => {
        // numbers (price, spaces) compare with subtraction, words compare alphabetically
        if (typeof a[key] === 'number') return (a[key] - b[key]) * direction;
        return a[key].localeCompare(b[key]) * direction;
      });
    }
  },

  methods: {
    // Runs when "Add to cart" is clicked
    addToCart(lesson) {
      if (lesson.spaces === 0) return;     // safety check: never go below 0
      lesson.spaces--;                     // one fewer space left

      const existing = this.cart.find(item => item.id === lesson.id);
      if (existing) {
        existing.quantity++;               // already in cart: add one more
      } else {
        this.cart.push({
          id: lesson.id, subject: lesson.subject, location: lesson.location,
          price: lesson.price, icon: lesson.icon, quantity: 1
        });
      }
      this.showToast(lesson.subject + ' added to cart');
    },

    // Shows the popup message for 2 seconds
    showToast(message) {
      this.toastMessage = message;
      clearTimeout(this.toastTimer);                 // cancel the old timer if still running
      this.toastTimer = setTimeout(() => {
        this.toastMessage = '';                      // hide it after 2 seconds
      }, 2000);
    },

    // Cart button: go to cart, or back to lessons if already there
    toggleCart() {
      if (this.currentPage === 'cart') {
        this.currentPage = 'lessons';
      } else {
        this.orderPlaced = false;   // always open the cart, not an old confirmation
        this.currentPage = 'cart';
      }
    },

    // Remove a lesson from the cart and give its spaces back to the lesson list
    removeFromCart(item) {
      const lesson = this.lessons.find(l => l.id === item.id);
      lesson.spaces += item.quantity;                       // spaces go back on the lesson card
      this.cart = this.cart.filter(c => c.id !== item.id);  // drop the row from the cart
      if (this.cart.length === 0) this.currentPage = 'lessons';  // nothing left, go back
    },

    // Runs when Checkout is clicked
    // (later we will add the fetch calls here: POST the order, PUT the new spaces)
    checkout() {
      if (!this.canCheckout) return;
      this.lastOrder = {
        name: this.customerName.trim(),
        phone: this.customerPhone.trim(),
        items: [...this.cart],
        spaces: this.cartCount,
        total: this.cartTotal
      };
      this.cart = [];
      this.customerName = '';
      this.customerPhone = '';
      this.orderPlaced = true;
    },

    // "Back to lessons" on the confirmation message
    finishOrder() {
      this.orderPlaced = false;
      this.currentPage = 'lessons';
    },

    // Text and colour for the spaces badge
    spacesLabel(spaces) {
      if (spaces === 0) return 'Fully booked';
      return spaces === 1 ? '1 space left' : spaces + ' spaces left';
    },
    spacesClass(spaces) {
      if (spaces === 0) return 'badge-out';
      if (spaces <= 2) return 'badge-low';
      return 'badge-ok';
    }
  }
}).mount('#app');