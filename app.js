const { createApp } = Vue;

// Address of the back-end server. Locally it is your own computer.
// When the server is on Render, change this one line to your Render address.
const API_URL = 'http://localhost:3000';

createApp({
  data() {
    return {
      currentPage: 'lessons',   // which page is showing: lessons, teachers or cart
      searchText: '',           // what the user types in the search box
      sortBy: 'topic',          // attribute to sort by
      sortOrder: 'asc',         // asc or desc
      selectedTeacher: 'all',   // teacher filter: 'all' or a teacher's name
      lessons: [],              // filled from the database by fetchLessons()
      loading: true,            // true while waiting for the server
      loadError: '',            // message shown if the lessons could not be loaded
      cart: [],                 // items added: { id, topic, location, price, icon, quantity }
      customerName: '',         // checkout form
      customerPhone: '',
      submitting: false,        // true while the order is being sent to the server
      orderPlaced: false,       // true after checkout, shows the confirmation message
      lastOrder: null,          // summary of the order just placed
      toastMessage: '',         // text shown in the popup ('' means hidden)
      toastIsError: false,      // red warning style instead of the green tick
      toastTimer: null          // remembers the timer so we can reset it
    };
  },

  // Runs once, as soon as the app is ready on the page
  created() {
    this.fetchLessons();
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
    // Checkout button is enabled only when both are valid (and we are not already sending)
    canCheckout() {
      return this.nameValid && this.phoneValid && this.cart.length > 0 && !this.submitting;
    },

    // List of teacher names for the dropdown, built from the lessons.
    // Set removes duplicates (each teacher has 2 lessons), sort puts them A to Z.
    teacherNames() {
      return [...new Set(this.lessons.map(lesson => lesson.teacher))].sort();
    },

    // The lessons actually shown: filtered by teacher, then by search, then sorted.
    // Vue re-runs this automatically whenever searchText, sortBy, sortOrder or lessons change.
    visibleLessons() {
      const text = this.searchText.trim().toLowerCase();

      // Step 1: teacher filter. 'all' keeps every lesson.
      const byTeacher = this.lessons.filter(lesson => {
        return this.selectedTeacher === 'all' || lesson.teacher === this.selectedTeacher;
      });

      // Step 2: search filter, applied to what is left after step 1
      const filtered = byTeacher.filter(lesson => {
        if (text === '') return true;
        return (
          lesson.topic.toLowerCase().includes(text) ||
          lesson.location.toLowerCase().includes(text) ||
          lesson.teacher.toLowerCase().includes(text) ||
          String(lesson.price).includes(text) ||
          String(lesson.space).includes(text)
        );
      });

      // Step 3: sort
      const key = this.sortBy;
      const direction = this.sortOrder === 'asc' ? 1 : -1;

      return [...filtered].sort((a, b) => {
        // numbers (price, space) compare with subtraction, words compare alphabetically
        if (typeof a[key] === 'number') return (a[key] - b[key]) * direction;
        return a[key].localeCompare(b[key]) * direction;
      });
    }
  },

  methods: {
    // ---------- FETCH 1: GET all lessons ----------
    fetchLessons() {
      this.loading = true;
      this.loadError = '';
      fetch(API_URL + '/lessons')
        .then(response => {
          if (!response.ok) throw new Error('Server answered with status ' + response.status);
          return response.json();                 // turn the JSON text into a JavaScript array
        })
        .then(data => {
          this.lessons = data;                    // the page updates by itself
        })
        .catch(error => {
          console.error(error);
          this.loadError = 'Could not load lessons. Is the server running?';
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // ---------- FETCH 2: POST a new order ----------
    saveOrder(order) {
      return fetch(API_URL + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)               // turn the JavaScript object into JSON text
      }).then(response => {
        if (!response.ok) throw new Error('Could not save order, status ' + response.status);
        return response.json();
      });
    },

    // ---------- FETCH 3: PUT the new number of spaces for one lesson ----------
    updateLessonSpace(lessonId, newSpace) {
      return fetch(API_URL + '/lessons/' + lessonId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space: newSpace })
      }).then(response => {
        if (!response.ok) throw new Error('Could not update lesson, status ' + response.status);
        return response.json();
      });
    },

    // Full web address of a lesson's picture, served by the back-end's static file middleware
    imageUrl(item) {
      return API_URL + '/images/' + item.image;
    },

    // Runs when "Add to cart" is clicked
    addToCart(lesson) {
      if (lesson.space === 0) return;      // safety check: never go below 0
      lesson.space--;                      // one fewer space left

      const existing = this.cart.find(item => item.id === lesson._id);
      if (existing) {
        existing.quantity++;               // already in cart: add one more
      } else {
        this.cart.push({
          id: lesson._id, topic: lesson.topic, location: lesson.location,
          price: lesson.price, icon: lesson.icon, image: lesson.image, quantity: 1
        });
      }
      this.showToast(lesson.topic + ' added to cart');
    },

    // Shows the popup message for 2 seconds (red style if isError is true)
    showToast(message, isError = false) {
      this.toastMessage = message;
      this.toastIsError = isError;
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
      const lesson = this.lessons.find(l => l._id === item.id);
      lesson.space += item.quantity;                        // spaces go back on the lesson card
      this.cart = this.cart.filter(c => c.id !== item.id);  // drop the row from the cart
      if (this.cart.length === 0) this.currentPage = 'lessons';  // nothing left, go back
    },

    // Runs when Checkout is clicked:
    // 1) POST the order, 2) PUT the new spaces for each lesson, 3) show the confirmation
    checkout() {
      if (!this.canCheckout) return;
      this.submitting = true;

      const order = {
        name: this.customerName.trim(),
        phone: this.customerPhone.trim(),
        items: this.cart.map(item => ({ lessonID: item.id, spaces: item.quantity }))
      };
      const summary = {
        name: order.name,
        phone: order.phone,
        items: [...this.cart],
        spaces: this.cartCount,
        total: this.cartTotal
      };

      this.saveOrder(order)
        .then(() => {
          // one PUT per lesson in the cart, all sent together
          return Promise.all(this.cart.map(item => {
            const lesson = this.lessons.find(l => l._id === item.id);
            return this.updateLessonSpace(item.id, lesson.space);
          }));
        })
        .then(() => {
          this.lastOrder = summary;
          this.cart = [];
          this.customerName = '';
          this.customerPhone = '';
          this.orderPlaced = true;
        })
        .catch(error => {
          console.error(error);
          this.showToast('Could not place the order. Please try again.', true);
        })
        .finally(() => {
          this.submitting = false;
        });
    },

    // "Back to lessons" on the confirmation message
    finishOrder() {
      this.orderPlaced = false;
      this.currentPage = 'lessons';
    },

    // Text and colour for the spaces badge
    spacesLabel(space) {
      if (space === 0) return 'Fully booked';
      return space === 1 ? '1 space left' : space + ' spaces left';
    },
    spacesClass(space) {
      if (space === 0) return 'badge-out';
      if (space <= 2) return 'badge-low';
      return 'badge-ok';
    }
  }
}).mount('#app');
