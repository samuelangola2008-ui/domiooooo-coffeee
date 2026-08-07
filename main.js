/* =====================================================================
       SEGURIDAD: utilidades de saneamiento
       - escapeHtml(): evita XSS al insertar texto proveniente del usuario
         (comentarios, nombre, dirección, etc.) dentro de innerHTML.
       - clampText(): recorta longitud como defensa adicional en JS,
         más allá del maxlength del HTML (que puede ser evadido por consola).
    ===================================================================== */
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      const div = document.createElement('div');
      div.textContent = String(str);
      return div.innerHTML;
    }

    function clampText(str, maxLen) {
      if (!str) return '';
      return String(str).slice(0, maxLen);
    }

    // SEGURIDAD: abrir enlaces externos sin exponer `window.opener`
    // (mitiga "reverse tabnabbing")
    function openExternalLink(url) {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;
    }

    let cart = [];
    let currentProduct = null;

    // Etiquetas del modal por tipo de producto
    const comboInfo = {
      sandwich: 'Arma tu sándwich en 3 pasos',
      nachos: 'Arma tus nachos en 3 pasos',
      totopos: 'Arma tus totopos en 1 paso',
      bowl: 'Arma tu bowl en 4 pasos',
      burrito: 'Arma tu burrito en 4 pasos',
      malteada: 'Elige tu malteada',
      torta: 'Elige tu porción de torta',
      sodaitaliana: 'Elige el sabor de tu soda italiana',
      simple: ''
    };

    // Variables de configuración del Bowl
    let baseQuantities = { arroz: 0, lechugas: 0, dia: 0 };
    let selectedProtein = null;
    let addProtQuantities = { carne: 0, cerdo: 0, costilla: 0, tenders: 0, chorizo: 0 };
    let selectedTops = {}; // hasta 7
    let addTopQuantities = { chicharron: 0, chorizo: 0, maduro: 0, maicitos: 0, guacamole: 0, pico: 0, doritox: 0, sour: 0, cebolla: 0, queso: 0, pepino: 0, jalapenos: 0 };
    let selectedSalsaBase = null;
    let addSalsaQuantities = { tatemada: 0, ajo: 0, bbq: 0 };

    // Variables de configuración del Burrito (idéntico al Bowl, pero SIN "La Base del Día")
    let burrBaseQuantities = { arroz: 0, lechugas: 0 };
    let burrSelectedProtein = null;
    let burrAddProtQuantities = { carne: 0, cerdo: 0, costilla: 0, tenders: 0, chorizo: 0 };
    let burrSelectedTops = {}; // hasta 7
    let burrAddTopQuantities = { chicharron: 0, chorizo: 0, maduro: 0, maicitos: 0, guacamole: 0, pico: 0, doritox: 0, sour: 0, cebolla: 0, queso: 0, pepino: 0, jalapenos: 0 };
    let burrSelectedSalsaBase = null;
    let burrAddSalsaQuantities = { tatemada: 0, ajo: 0, bbq: 0 };

    // Variables de configuración del Sandwich
    let sandwichSelectedProtein = null;
    let sandwichToppingQuantities = { lechuga: 0, tomate: 0, cebolla: 0, cebollaencurtida: 0, jalapeno: 0, chicharron: 0, doritox: 0, maizcito: 0 };
    let sandwichSelectedSalsa = null;
    let sandwichProductQty = 1;

    // Variables de configuración de Totopos
    let totoposQuantities = { guacamole: 0, jalapenos: 0, picodegallo: 0, ajo: 0, tatemada: 0, sourcream: 0 };

    // Variables de configuración de Malteada
    let malteadaSelectedFlavor = null;
    let malteadaToppingQuantities = { chantilly: 0, galletablanca: 0, galletaoreo: 0 };
    let malteadaSelectedSalsa = null;

    // Variables de configuración de Porción de Torta
    let tortaSelections = { cakeA: null, toppingA: null, cakeB: null, toppingB: null, salsa: null };

    // Variables de configuración de Nachos
    let nachosSelectedProtein = null;
    let nachosSelectedTops = {};
    let nachosSelectedSalsa = null;

    // Variables de configuración de Soda Italiana
    let sodaItalianaSelectedFlavor = null;
    let sodaItalianaQty = 1;

    // Variables de configuración de Productos Simples
    let simpleProductQty = 1;
    let simpleCategory = '';

    // SEGURIDAD: límites de defensa en profundidad (evitan que alguien manipule
    // la cantidad vía consola y genere pedidos absurdos/DoS visual en WhatsApp)
    const MAX_ITEM_QTY = 20;
    const MAX_CART_ITEMS = 50;

    // Configuración del horario de atención (formato 24h)
    const STORE_OPEN_HOUR = 10;   // 10:00 am
    const STORE_OPEN_MIN = 0;
    const STORE_CLOSE_HOUR = 16;  // 4:30 pm
    const STORE_CLOSE_MIN = 30;

    function updateStoreStatus() {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = STORE_OPEN_HOUR * 60 + STORE_OPEN_MIN;
      const closeMinutes = STORE_CLOSE_HOUR * 60 + STORE_CLOSE_MIN;

      const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

      const badge = document.getElementById('storeStatusBadge');
      const alertNotice = document.getElementById('checkoutAlertNotice');

      if (isOpen) {
        badge.classList.remove('status-closed');
        badge.classList.add('status-open');
        badge.innerText = 'Abierto';
        if (alertNotice) {
          alertNotice.innerHTML = '✅ ¡Estamos <strong>abiertos</strong>! Tu pedido se preparará de inmediato tras confirmarlo por WhatsApp.';
        }
      } else {
        badge.classList.remove('status-open');
        badge.classList.add('status-closed');
        badge.innerText = 'Cerrado';
        if (alertNotice) {
          alertNotice.innerHTML = '⚠️ Nota: Actualmente el indicador está en modo <strong>Cerrado</strong>, pero puedes enviar tu pedido con total normalidad a través de WhatsApp.';
        }
      }
    }

    function showSection(sectionID) {
      document.getElementById('catalogSection').style.display = 'none';
      document.getElementById('cartSection').classList.remove('active');
      document.getElementById('checkoutSection').classList.remove('active');

      if(sectionID === 'catalog') {
        document.getElementById('catalogSection').style.display = 'block';
      } else if(sectionID === 'cart') {
        document.getElementById('cartSection').classList.add('active');
        renderCart();
      } else if(sectionID === 'checkout') {
        document.getElementById('checkoutSection').classList.add('active');
      }
      window.scrollTo(0, 0);
    }

    function scrollToCategory(catId) {
      const el = document.getElementById(catId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function openProductModal(name, price, type, category) {
      currentProduct = { name, basePrice: price, type };
      document.getElementById('modalProductName').innerText = name;
      document.getElementById('modalTagline').innerText = comboInfo[type] || '';
      document.getElementById('modalBasePrice').innerText = '$ ' + price.toLocaleString();

      // Resetear selecciones del Bowl
      baseQuantities = { arroz: 0, lechugas: 0, dia: 0 };
      selectedProtein = null;
      addProtQuantities = { carne: 0, cerdo: 0, costilla: 0, tenders: 0, chorizo: 0 };
      selectedTops = {};
      addTopQuantities = { chicharron: 0, chorizo: 0, maduro: 0, maicitos: 0, guacamole: 0, pico: 0, doritox: 0, sour: 0, cebolla: 0, queso: 0, pepino: 0, jalapenos: 0 };
      selectedSalsaBase = null;
      addSalsaQuantities = { tatemada: 0, ajo: 0, bbq: 0 };
      document.getElementById('bowlComentarios').value = '';
      document.getElementById('toppingsCounterText').innerText = '(Elige 7 · 0 / 7)';

      // Resetear selecciones del Burrito
      burrBaseQuantities = { arroz: 0, lechugas: 0 };
      burrSelectedProtein = null;
      burrAddProtQuantities = { carne: 0, cerdo: 0, costilla: 0, tenders: 0, chorizo: 0 };
      burrSelectedTops = {};
      burrAddTopQuantities = { chicharron: 0, chorizo: 0, maduro: 0, maicitos: 0, guacamole: 0, pico: 0, doritox: 0, sour: 0, cebolla: 0, queso: 0, pepino: 0, jalapenos: 0 };
      burrSelectedSalsaBase = null;
      burrAddSalsaQuantities = { tatemada: 0, ajo: 0, bbq: 0 };
      document.getElementById('burritoComentarios').value = '';
      document.getElementById('burrToppingsCounterText').innerText = '(Elige 7 · 0 / 7)';

      // Resetear selecciones del Sandwich
      sandwichSelectedProtein = null;
      sandwichToppingQuantities = { lechuga: 0, tomate: 0, cebolla: 0, cebollaencurtida: 0, jalapeno: 0, chicharron: 0, doritox: 0, maizcito: 0 };
      sandwichSelectedSalsa = null;
      sandwichProductQty = 1;
      document.getElementById('sandwichComentarios').value = '';
      document.getElementById('swToppingsCounterText').innerText = '(Elige 3 · 0 / 3)';

      // Resetear selecciones de Totopos
      totoposQuantities = { guacamole: 0, jalapenos: 0, picodegallo: 0, ajo: 0, tatemada: 0, sourcream: 0 };
      document.getElementById('totoposComentarios').value = '';
      document.getElementById('totoposCounterText').innerText = '(Elige 2 · 0 / 2)';

      // Resetear selecciones de Malteada
      malteadaSelectedFlavor = null;
      malteadaToppingQuantities = { chantilly: 0, galletablanca: 0, galletaoreo: 0 };
      malteadaSelectedSalsa = null;
      document.getElementById('malteadaComentarios').value = '';

      // Resetear selecciones de Porción de Torta
      tortaSelections = { cakeA: null, toppingA: null, cakeB: null, toppingB: null, salsa: null };
      document.getElementById('tortaComentarios').value = '';

      // Resetear selecciones de Nachos
      nachosSelectedProtein = null;
      nachosSelectedTops = {};
      nachosSelectedSalsa = null;
      document.getElementById('nachosComentarios').value = '';
      document.getElementById('nachosToppingsCounterText').innerText = '(Elige 7 · 0 / 7)';

      // Resetear selecciones de Soda Italiana
      sodaItalianaSelectedFlavor = null;
      sodaItalianaQty = 1;
      document.getElementById('sodaItalianaComentarios').value = '';
      document.getElementById('sodaItalianaQty').innerText = '1';

      // Resetear selecciones de Productos Simples
      simpleProductQty = 1;
      simpleCategory = category || '';
      document.getElementById('simpleComentarios').value = '';
      document.getElementById('simpleProductQty').innerText = '1';
      document.getElementById('simpleCategoryLabel').innerText = simpleCategory;

      // Actualizar UI del modal
      document.querySelectorAll('.qty-value').forEach(el => el.innerText = '0');
      document.querySelectorAll('.opt-box').forEach(el => el.classList.remove('selected-blue'));
      document.getElementById('sandwichProductQty').innerText = '1';
      document.getElementById('simpleProductQty').innerText = '1';
      document.getElementById('sodaItalianaQty').innerText = '1';

      // Mostrar u ocultar personalizaciones según el tipo
      document.getElementById('bowlCustomizationContainer').style.display = 'none';
      document.getElementById('burritoCustomizationContainer').style.display = 'none';
      document.getElementById('sandwichCustomizationContainer').style.display = 'none';
      document.getElementById('totoposCustomizationContainer').style.display = 'none';
      document.getElementById('malteadaCustomizationContainer').style.display = 'none';
      document.getElementById('tortaCustomizationContainer').style.display = 'none';
      document.getElementById('nachosCustomizationContainer').style.display = 'none';
      document.getElementById('sodaItalianaCustomizationContainer').style.display = 'none';
      document.getElementById('simpleCustomizationContainer').style.display = 'none';

      if (type === 'burrito') {
        document.getElementById('burritoCustomizationContainer').style.display = 'block';
      } else if (type === 'sandwich') {
        document.getElementById('sandwichCustomizationContainer').style.display = 'block';
      } else if (type === 'totopos') {
        document.getElementById('totoposCustomizationContainer').style.display = 'block';
      } else if (type === 'malteada') {
        document.getElementById('malteadaCustomizationContainer').style.display = 'block';
      } else if (type === 'torta') {
        document.getElementById('tortaCustomizationContainer').style.display = 'block';
      } else if (type === 'nachos') {
        document.getElementById('nachosCustomizationContainer').style.display = 'block';
      } else if (type === 'sodaitaliana') {
        document.getElementById('sodaItalianaCustomizationContainer').style.display = 'block';
      } else if (type === 'simple') {
        document.getElementById('simpleCustomizationContainer').style.display = 'block';
      } else {
        document.getElementById('bowlCustomizationContainer').style.display = 'block';
      }

      document.getElementById('productModal').classList.add('active');
      calculateModalTotal();
    }

    function closeProductModal() {
      document.getElementById('productModal').classList.remove('active');
    }

    // 1. Lógica de Bases (Máximo 3 porciones en total, 0-2 por ítem)
    function changeBaseQty(key, delta) {
      let currentVal = baseQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 2) newVal = 2;

      let totalOthers = Object.keys(baseQuantities).reduce((sum, k) => k === key ? sum : sum + baseQuantities[k], 0);
      
      if (totalOthers + newVal > 3) {
        alert('Solo puedes seleccionar un máximo de 3 porciones.');
        return;
      }

      baseQuantities[key] = newVal;
      document.getElementById('qty_base_' + key).innerText = newVal;
      
      const box = document.getElementById('box_base_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 1b. Lógica de Bases del BURRITO (Máximo 3 porciones en total, 0-2 por ítem, sin "La Base del Día")
    function changeBurrBaseQty(key, delta) {
      let currentVal = burrBaseQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 2) newVal = 2;

      let totalOthers = Object.keys(burrBaseQuantities).reduce((sum, k) => k === key ? sum : sum + burrBaseQuantities[k], 0);

      if (totalOthers + newVal > 3) {
        alert('Solo puedes seleccionar un máximo de 3 porciones.');
        return;
      }

      burrBaseQuantities[key] = newVal;
      document.getElementById('qty_burrbase_' + key).innerText = newVal;

      const box = document.getElementById('box_burrbase_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 2. Lógica de Proteínas (Una única opción obligatoria)
    function selectProtein(key, displayName, price) {
      if (selectedProtein && selectedProtein.key === key) {
        selectedProtein = null;
        document.getElementById('box_prot_' + key).classList.remove('selected-blue');
      } else {
        if (selectedProtein) {
          document.getElementById('box_prot_' + selectedProtein.key).classList.remove('selected-blue');
        }
        selectedProtein = { key, displayName, price };
        document.getElementById('box_prot_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 2b. Lógica de Proteínas del BURRITO (Una única opción obligatoria)
    function selectBurrProtein(key, displayName, price) {
      if (burrSelectedProtein && burrSelectedProtein.key === key) {
        burrSelectedProtein = null;
        document.getElementById('box_burrprot_' + key).classList.remove('selected-blue');
      } else {
        if (burrSelectedProtein) {
          document.getElementById('box_burrprot_' + burrSelectedProtein.key).classList.remove('selected-blue');
        }
        burrSelectedProtein = { key, displayName, price };
        document.getElementById('box_burrprot_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 3. Lógica de Adición de Proteína (Máximo 1)
    function changeAddProtQty(key, delta) {
      let currentVal = addProtQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('Solo puedes agregar un máximo de 1 unidad de esta proteína.');
        return;
      }

      addProtQuantities[key] = newVal;
      document.getElementById('qty_addprot_' + key).innerText = newVal;

      const box = document.getElementById('box_addprot_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 3b. Lógica de Adición de Proteína del BURRITO (Máximo 1)
    function changeAddBurrProtQty(key, delta) {
      let currentVal = burrAddProtQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('Solo puedes agregar un máximo de 1 unidad de esta proteína.');
        return;
      }

      burrAddProtQuantities[key] = newVal;
      document.getElementById('qty_burraddprot_' + key).innerText = newVal;

      const box = document.getElementById('box_burraddprot_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 4. Lógica de Toppings (Máximo 7 incluidos)
    function toggleTop(key, displayName, price) {
      const box = document.getElementById('box_top_' + key);
      if (selectedTops[key]) {
        delete selectedTops[key];
        box.classList.remove('selected-blue');
      } else {
        const currentCount = Object.keys(selectedTops).length;
        if (currentCount >= 7) {
          alert('Solo puedes seleccionar un máximo de 7 toppings.');
          return;
        }
        selectedTops[key] = { displayName, price };
        box.classList.add('selected-blue');
      }
      
      let count = Object.keys(selectedTops).length;
      document.getElementById('toppingsCounterText').innerText = `(Elige 7 · ${count} / 7)`;
      calculateModalTotal();
    }

    // 4b. Lógica de Toppings del BURRITO (Máximo 7 incluidos)
    function toggleBurrTop(key, displayName, price) {
      const box = document.getElementById('box_burrtop_' + key);
      if (burrSelectedTops[key]) {
        delete burrSelectedTops[key];
        box.classList.remove('selected-blue');
      } else {
        const currentCount = Object.keys(burrSelectedTops).length;
        if (currentCount >= 7) {
          alert('Solo puedes seleccionar un máximo de 7 toppings.');
          return;
        }
        burrSelectedTops[key] = { displayName, price };
        box.classList.add('selected-blue');
      }

      let count = Object.keys(burrSelectedTops).length;
      document.getElementById('burrToppingsCounterText').innerText = `(Elige 7 · ${count} / 7)`;
      calculateModalTotal();
    }

    // 5. Lógica de Adición de Toppings (Máximo 1 unidad por cada topping, no pasar de 1)
    function changeAddTopQty(key, delta) {
      let currentVal = addTopQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('No se puede pasar de 1 al adicionar topping.');
        return;
      }

      addTopQuantities[key] = newVal;
      document.getElementById('qty_add_' + key).innerText = newVal;

      const box = document.getElementById('box_add_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 5b. Lógica de Adición de Toppings del BURRITO (Máximo 1 unidad por cada topping, no pasar de 1)
    function changeAddBurrTopQty(key, delta) {
      let currentVal = burrAddTopQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('No se puede pasar de 1 al adicionar topping.');
        return;
      }

      burrAddTopQuantities[key] = newVal;
      document.getElementById('qty_burradd_' + key).innerText = newVal;

      const box = document.getElementById('box_burradd_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 6. Lógica de Salsa Base (Escoge 1)
    function selectSalsaBase(key, displayName) {
      if (selectedSalsaBase && selectedSalsaBase.key === key) {
        selectedSalsaBase = null;
        document.getElementById('box_salsabase_' + key).classList.remove('selected-blue');
      } else {
        if (selectedSalsaBase) {
          document.getElementById('box_salsabase_' + selectedSalsaBase.key).classList.remove('selected-blue');
        }
        selectedSalsaBase = { key, displayName };
        document.getElementById('box_salsabase_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 6b. Lógica de Salsa Base del BURRITO (Escoge 1)
    function selectBurrSalsaBase(key, displayName) {
      if (burrSelectedSalsaBase && burrSelectedSalsaBase.key === key) {
        burrSelectedSalsaBase = null;
        document.getElementById('box_burrsalsabase_' + key).classList.remove('selected-blue');
      } else {
        if (burrSelectedSalsaBase) {
          document.getElementById('box_burrsalsabase_' + burrSelectedSalsaBase.key).classList.remove('selected-blue');
        }
        burrSelectedSalsaBase = { key, displayName };
        document.getElementById('box_burrsalsabase_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 7. Lógica de Adición de Salsas (Máximo 1 por cada salsa)
    function changeAddSalsaQty(key, delta) {
      let currentVal = addSalsaQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('Solo puedes agregar un máximo de 1 unidad de esta salsa.');
        return;
      }

      addSalsaQuantities[key] = newVal;
      document.getElementById('qty_addsalsa_' + key).innerText = newVal;

      const box = document.getElementById('box_addsalsa_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 7b. Lógica de Adición de Salsas del BURRITO (Máximo 1 por cada salsa)
    function changeAddBurrSalsaQty(key, delta) {
      let currentVal = burrAddSalsaQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;
      if (newVal > 1) {
        alert('Solo puedes agregar un máximo de 1 unidad de esta salsa.');
        return;
      }

      burrAddSalsaQuantities[key] = newVal;
      document.getElementById('qty_burraddsalsa_' + key).innerText = newVal;

      const box = document.getElementById('box_burraddsalsa_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 8. Lógica de Proteína del Sandwich (Selección única, obligatoria)
    function selectSandwichProtein(key, displayName, price) {
      if (sandwichSelectedProtein && sandwichSelectedProtein.key === key) {
        sandwichSelectedProtein = null;
        document.getElementById('box_sw_prot_' + key).classList.remove('selected-blue');
      } else {
        if (sandwichSelectedProtein) {
          document.getElementById('box_sw_prot_' + sandwichSelectedProtein.key).classList.remove('selected-blue');
        }
        sandwichSelectedProtein = { key, displayName, price };
        document.getElementById('box_sw_prot_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 9. Lógica de Toppings del Sandwich (Máximo 3 en total, sin costo adicional)
    function changeSandwichToppingQty(key, delta) {
      let currentVal = sandwichToppingQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;

      let totalOthers = Object.keys(sandwichToppingQuantities).reduce((sum, k) => k === key ? sum : sum + sandwichToppingQuantities[k], 0);

      if (totalOthers + newVal > 3) {
        alert('Solo puedes seleccionar un máximo de 3 toppings.');
        return;
      }

      sandwichToppingQuantities[key] = newVal;
      document.getElementById('qty_sw_top_' + key).innerText = newVal;

      const box = document.getElementById('box_sw_top_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      let total = Object.values(sandwichToppingQuantities).reduce((a, b) => a + b, 0);
      document.getElementById('swToppingsCounterText').innerText = `(Elige 3 · ${total} / 3)`;

      calculateModalTotal();
    }

    // 10. Lógica de Salsa del Sandwich (Selección única, obligatoria)
    function selectSandwichSalsa(key, displayName) {
      if (sandwichSelectedSalsa && sandwichSelectedSalsa.key === key) {
        sandwichSelectedSalsa = null;
        document.getElementById('box_sw_salsa_' + key).classList.remove('selected-blue');
      } else {
        if (sandwichSelectedSalsa) {
          document.getElementById('box_sw_salsa_' + sandwichSelectedSalsa.key).classList.remove('selected-blue');
        }
        sandwichSelectedSalsa = { key, displayName };
        document.getElementById('box_sw_salsa_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 11. Lógica de Cantidad del producto Sandwich (mínimo 1, máximo MAX_ITEM_QTY)
    function changeSandwichProductQty(delta) {
      let newVal = sandwichProductQty + delta;
      if (newVal < 1) newVal = 1;
      if (newVal > MAX_ITEM_QTY) newVal = MAX_ITEM_QTY;
      sandwichProductQty = newVal;
      document.getElementById('sandwichProductQty').innerText = newVal;
      calculateModalTotal();
    }

    // 12. Lógica de Toppings de Totopos (Máximo 2 en total)
    function changeTotoposQty(key, delta) {
      let currentVal = totoposQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;

      let totalOthers = Object.keys(totoposQuantities).reduce((sum, k) => k === key ? sum : sum + totoposQuantities[k], 0);

      if (totalOthers + newVal > 2) {
        alert('Solo puedes seleccionar un máximo de 2 toppings en total.');
        return;
      }

      totoposQuantities[key] = newVal;
      document.getElementById('qty_totopos_' + key).innerText = newVal;

      const box = document.getElementById('box_totopos_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      let total = Object.values(totoposQuantities).reduce((a, b) => a + b, 0);
      document.getElementById('totoposCounterText').innerText = `(Elige 2 · ${total} / 2)`;

      calculateModalTotal();
    }

    // 13. Lógica de Sabor de Malteada (Selección única, opcional, Máximo 1)
    function selectMalteadaFlavor(key, displayName) {
      if (malteadaSelectedFlavor && malteadaSelectedFlavor.key === key) {
        malteadaSelectedFlavor = null;
        document.getElementById('box_malteada_' + key).classList.remove('selected-blue');
      } else {
        if (malteadaSelectedFlavor) {
          document.getElementById('box_malteada_' + malteadaSelectedFlavor.key).classList.remove('selected-blue');
        }
        malteadaSelectedFlavor = { key, displayName };
        document.getElementById('box_malteada_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 13b. Lógica de Toppings de Malteada (Máximo 2 en total)
    function changeMalteadaToppingQty(key, delta) {
      let currentVal = malteadaToppingQuantities[key];
      let newVal = currentVal + delta;

      if (newVal < 0) newVal = 0;

      let totalOthers = Object.keys(malteadaToppingQuantities).reduce((sum, k) => k === key ? sum : sum + malteadaToppingQuantities[k], 0);

      if (totalOthers + newVal > 2) {
        alert('Solo puedes seleccionar un máximo de 2 toppings en total.');
        return;
      }

      malteadaToppingQuantities[key] = newVal;
      document.getElementById('qty_malteadatop_' + key).innerText = newVal;

      const box = document.getElementById('box_malteadatop_' + key);
      if (newVal > 0) box.classList.add('selected-blue');
      else box.classList.remove('selected-blue');

      calculateModalTotal();
    }

    // 13c. Lógica de Salsa de Malteada (Selección única, opcional, Máximo 1)
    function selectMalteadaSalsa(key, displayName) {
      if (malteadaSelectedSalsa && malteadaSelectedSalsa.key === key) {
        malteadaSelectedSalsa = null;
        document.getElementById('box_malteadasalsa_' + key).classList.remove('selected-blue');
      } else {
        if (malteadaSelectedSalsa) {
          document.getElementById('box_malteadasalsa_' + malteadaSelectedSalsa.key).classList.remove('selected-blue');
        }
        malteadaSelectedSalsa = { key, displayName };
        document.getElementById('box_malteadasalsa_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 14. Lógica de Porción de Torta (selección única por grupo)
    function selectTortaOption(group, key, displayName) {
      const prev = tortaSelections[group];
      if (prev && prev.key === key) {
        tortaSelections[group] = null;
        document.getElementById('box_torta_' + key).classList.remove('selected-blue');
      } else {
        if (prev) {
          document.getElementById('box_torta_' + prev.key).classList.remove('selected-blue');
        }
        tortaSelections[group] = { key, displayName };
        document.getElementById('box_torta_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 15. Lógica de Cantidad de Productos Simples (mínimo 1, máximo MAX_ITEM_QTY)
    function changeSimpleProductQty(delta) {
      let newVal = simpleProductQty + delta;
      if (newVal < 1) newVal = 1;
      if (newVal > MAX_ITEM_QTY) newVal = MAX_ITEM_QTY;
      simpleProductQty = newVal;
      document.getElementById('simpleProductQty').innerText = newVal;
      calculateModalTotal();
    }

    // 16. Lógica de Proteína de Nachos (Paso 1, elige 1)
    function selectNachosProtein(key, displayName, price) {
      if (nachosSelectedProtein && nachosSelectedProtein.key === key) {
        nachosSelectedProtein = null;
        document.getElementById('box_nachosprot_' + key).classList.remove('selected-blue');
      } else {
        if (nachosSelectedProtein) {
          document.getElementById('box_nachosprot_' + nachosSelectedProtein.key).classList.remove('selected-blue');
        }
        nachosSelectedProtein = { key, displayName, price };
        document.getElementById('box_nachosprot_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 17. Lógica de Toppings de Nachos (Paso 2, elige 7)
    function toggleNachosTop(key, displayName, price) {
      const box = document.getElementById('box_nachostop_' + key);
      if (nachosSelectedTops[key]) {
        delete nachosSelectedTops[key];
        box.classList.remove('selected-blue');
      } else {
        const currentCount = Object.keys(nachosSelectedTops).length;
        if (currentCount >= 7) {
          alert('Solo puedes seleccionar un máximo de 7 toppings.');
          return;
        }
        nachosSelectedTops[key] = { displayName, price };
        box.classList.add('selected-blue');
      }

      let count = Object.keys(nachosSelectedTops).length;
      document.getElementById('nachosToppingsCounterText').innerText = `(Elige 7 · ${count} / 7)`;
      calculateModalTotal();
    }

    // 18. Lógica de Salsa de Nachos (Paso 3, elige 1)
    function selectNachosSalsa(key, displayName) {
      if (nachosSelectedSalsa && nachosSelectedSalsa.key === key) {
        nachosSelectedSalsa = null;
        document.getElementById('box_nachossalsa_' + key).classList.remove('selected-blue');
      } else {
        if (nachosSelectedSalsa) {
          document.getElementById('box_nachossalsa_' + nachosSelectedSalsa.key).classList.remove('selected-blue');
        }
        nachosSelectedSalsa = { key, displayName };
        document.getElementById('box_nachossalsa_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 19. Lógica de Sabor de Soda Italiana (Selección única, obligatoria)
    function selectSodaItalianaFlavor(key, displayName) {
      if (sodaItalianaSelectedFlavor && sodaItalianaSelectedFlavor.key === key) {
        sodaItalianaSelectedFlavor = null;
        document.getElementById('box_sodait_' + key).classList.remove('selected-blue');
      } else {
        if (sodaItalianaSelectedFlavor) {
          document.getElementById('box_sodait_' + sodaItalianaSelectedFlavor.key).classList.remove('selected-blue');
        }
        sodaItalianaSelectedFlavor = { key, displayName };
        document.getElementById('box_sodait_' + key).classList.add('selected-blue');
      }
      calculateModalTotal();
    }

    // 20. Lógica de Cantidad de Soda Italiana (mínimo 1, máximo MAX_ITEM_QTY)
    function changeSodaItalianaQty(delta) {
      let newVal = sodaItalianaQty + delta;
      if (newVal < 1) newVal = 1;
      if (newVal > MAX_ITEM_QTY) newVal = MAX_ITEM_QTY;
      sodaItalianaQty = newVal;
      document.getElementById('sodaItalianaQty').innerText = newVal;
      calculateModalTotal();
    }

    // Cálculo dinámico del precio total en el modal
    function calculateModalTotal() {
      // Cálculo específico para Totopos
      if (currentProduct.type === 'totopos') {
        let totoposTotal = currentProduct.basePrice;
        document.getElementById('modalTotalPrice').innerText = '$ ' + totoposTotal.toLocaleString();
        return totoposTotal;
      }

      // Cálculo específico para Malteada (precio base fijo, sin adiciones de costo)
      if (currentProduct.type === 'malteada') {
        document.getElementById('modalTotalPrice').innerText = '$ ' + currentProduct.basePrice.toLocaleString();
        return currentProduct.basePrice;
      }

      // Cálculo específico para Porción de Torta (precio fijo, sin adiciones de costo)
      if (currentProduct.type === 'torta') {
        document.getElementById('modalTotalPrice').innerText = '$ ' + currentProduct.basePrice.toLocaleString();
        return currentProduct.basePrice;
      }

      // Cálculo específico para Nachos (proteína + toppings con costo)
      if (currentProduct.type === 'nachos') {
        let nachosTotal = currentProduct.basePrice;
        if (nachosSelectedProtein) nachosTotal += nachosSelectedProtein.price;
        for (let k in nachosSelectedTops) {
          nachosTotal += nachosSelectedTops[k].price;
        }
        document.getElementById('modalTotalPrice').innerText = '$ ' + nachosTotal.toLocaleString();
        return nachosTotal;
      }

      // Cálculo específico para Sandwich (proteína) x cantidad
      if (currentProduct.type === 'sandwich') {
        let swTotal = currentProduct.basePrice;
        if (sandwichSelectedProtein) swTotal += sandwichSelectedProtein.price;
        swTotal = swTotal * sandwichProductQty;
        document.getElementById('modalTotalPrice').innerText = '$ ' + swTotal.toLocaleString();
        return swTotal;
      }

      // Cálculo específico para Soda Italiana (precio base x cantidad)
      if (currentProduct.type === 'sodaitaliana') {
        let sodaTotal = currentProduct.basePrice * sodaItalianaQty;
        document.getElementById('modalTotalPrice').innerText = '$ ' + sodaTotal.toLocaleString();
        return sodaTotal;
      }

      // Cálculo específico para Productos Simples (precio base x cantidad)
      if (currentProduct.type === 'simple') {
        let simpleTotal = currentProduct.basePrice * simpleProductQty;
        document.getElementById('modalTotalPrice').innerText = '$ ' + simpleTotal.toLocaleString();
        return simpleTotal;
      }

      // Cálculo específico para Burrito (idéntico al Bowl, sin "La Base del Día")
      if (currentProduct.type === 'burrito') {
        let burrTotal = currentProduct.basePrice;

        if (burrSelectedProtein) burrTotal += burrSelectedProtein.price;

        let totalAddProtQty = Object.values(burrAddProtQuantities).reduce((a, b) => a + b, 0);
        burrTotal += totalAddProtQty * 8000;

        for (let k in burrSelectedTops) {
          burrTotal += burrSelectedTops[k].price;
        }

        let totalAddTopQty = Object.values(burrAddTopQuantities).reduce((a, b) => a + b, 0);
        burrTotal += totalAddTopQty * 3000;

        let totalSalsasQty = Object.values(burrAddSalsaQuantities).reduce((a, b) => a + b, 0);
        burrTotal += totalSalsasQty * 1000;

        document.getElementById('modalTotalPrice').innerText = '$ ' + burrTotal.toLocaleString();
        return burrTotal;
      }

      let total = currentProduct.basePrice;

      if (selectedProtein) total += selectedProtein.price;

      // Costo de adición de proteína ($8.000 c/u)
      let totalAddProtQty = Object.values(addProtQuantities).reduce((a, b) => a + b, 0);
      total += totalAddProtQty * 8000;

      // Costo de toppings incluidos (queso mozzarella +$2.000, resto sin costo)
      for (let k in selectedTops) {
        total += selectedTops[k].price;
      }

      // Costo de adición de toppings ($3.000 c/u)
      let totalAddTopQty = Object.values(addTopQuantities).reduce((a, b) => a + b, 0);
      total += totalAddTopQty * 3000;

      // Costo de adición de salsas ($1.000 c/u)
      let totalSalsasQty = Object.values(addSalsaQuantities).reduce((a, b) => a + b, 0);
      total += totalSalsasQty * 1000;

      document.getElementById('modalTotalPrice').innerText = '$ ' + total.toLocaleString();
      return total;
    }

    // Agregar producto al carrito
    function addToCart() {
      // SEGURIDAD: evitar que la canasta crezca sin límite (protección básica anti-abuso)
      if (cart.length >= MAX_CART_ITEMS) {
        alert('Has alcanzado el máximo de productos por pedido. Finaliza tu orden o elimina algún ítem.');
        return;
      }

      // Rama específica para Totopos
      if (currentProduct.type === 'totopos') {
        let salsaNames = { guacamole: 'Guacamole', jalapenos: 'Jalapeños', picodegallo: 'Pico De Gallo', ajo: 'Salsa De Ajo', tatemada: 'Salsa Tatemada', sourcream: 'Sour Cream' };
        let details = [];
        let parts = [];
        for (let k in totoposQuantities) {
          if (totoposQuantities[k] > 0) parts.push(`${salsaNames[k]} x${totoposQuantities[k]}`);
        }
        if (parts.length > 0) details.push(`Toppings: ${parts.join(', ')}`);

        let comentarios = clampText(document.getElementById('totoposComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        let totoposPrice = currentProduct.basePrice;

        cart.push({
          name: currentProduct.name,
          price: totoposPrice,
          details: details.join(' | ') || 'Estándar',
          quantity: 1
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Malteada
      if (currentProduct.type === 'malteada') {
        let details = [];

        if (malteadaSelectedFlavor) details.push(`Sabor: ${malteadaSelectedFlavor.displayName}`);

        let toppingNames = { chantilly: 'Chantilly', galletablanca: 'Galleta Triturada Blanca', galletaoreo: 'Galleta Triturada Oreo' };
        let toppingParts = [];
        for (let k in malteadaToppingQuantities) {
          if (malteadaToppingQuantities[k] > 0) toppingParts.push(`${toppingNames[k]} x${malteadaToppingQuantities[k]}`);
        }
        if (toppingParts.length > 0) details.push(`Toppings: ${toppingParts.join(', ')}`);

        if (malteadaSelectedSalsa) details.push(`Salsa: ${malteadaSelectedSalsa.displayName}`);

        let comentarios = clampText(document.getElementById('malteadaComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: currentProduct.basePrice,
          details: details.join(' | ') || 'Estándar',
          quantity: 1
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Porción de Torta
      if (currentProduct.type === 'torta') {
        let details = [];
        for (let g in tortaSelections) {
          if (tortaSelections[g]) details.push(tortaSelections[g].displayName);
        }
        let comentarios = clampText(document.getElementById('tortaComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: currentProduct.basePrice,
          details: details.join(' | ') || 'Estándar',
          quantity: 1
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Nachos
      if (currentProduct.type === 'nachos') {
        let unitPrice = currentProduct.basePrice;
        if (nachosSelectedProtein) unitPrice += nachosSelectedProtein.price;
        let details = [];

        if (nachosSelectedProtein) details.push(`Proteína: ${nachosSelectedProtein.displayName}`);

        let topParts = [];
        for (let k in nachosSelectedTops) {
          topParts.push(nachosSelectedTops[k].displayName);
        }
        if (topParts.length > 0) details.push(`Toppings: ${topParts.join(', ')}`);

        if (nachosSelectedSalsa) details.push(`Salsa: ${nachosSelectedSalsa.displayName}`);

        let comentarios = clampText(document.getElementById('nachosComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: unitPrice,
          details: details.join(' | ') || 'Estándar',
          quantity: 1
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Sandwich
      if (currentProduct.type === 'sandwich') {
        let unitPrice = currentProduct.basePrice + (sandwichSelectedProtein ? sandwichSelectedProtein.price : 0);
        let details = [];

        if (sandwichSelectedProtein) details.push(`Proteína: ${sandwichSelectedProtein.displayName}`);

        let toppingNames = { lechuga: 'Lechuga Mix', tomate: 'Tomate', cebolla: 'Cebolla Crispy', cebollaencurtida: 'Cebolla Encurtida', jalapeno: 'Jalapeño', chicharron: 'Chicharrón', doritox: 'Doritox', maizcito: 'Maizcito' };
        let toppingParts = [];
        for (let k in sandwichToppingQuantities) {
          if (sandwichToppingQuantities[k] > 0) toppingParts.push(`${toppingNames[k]} x${sandwichToppingQuantities[k]}`);
        }
        if (toppingParts.length > 0) details.push(`Toppings: ${toppingParts.join(', ')}`);

        if (sandwichSelectedSalsa) details.push(`Salsa: ${sandwichSelectedSalsa.displayName}`);

        let comentarios = clampText(document.getElementById('sandwichComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: unitPrice,
          details: details.join(' | ') || 'Estándar',
          quantity: sandwichProductQty
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Soda Italiana
      if (currentProduct.type === 'sodaitaliana') {
        let details = [];
        if (sodaItalianaSelectedFlavor) details.push(`Sabor: ${sodaItalianaSelectedFlavor.displayName}`);

        let comentarios = clampText(document.getElementById('sodaItalianaComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: currentProduct.basePrice,
          details: details.join(' | ') || 'Estándar',
          quantity: sodaItalianaQty
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Productos Simples (solo comentarios y cantidad)
      if (currentProduct.type === 'simple') {
        let details = [];
        let comentarios = clampText(document.getElementById('simpleComentarios').value.trim(), 250);
        if (comentarios) details.push(`Comentarios: ${comentarios}`);

        cart.push({
          name: currentProduct.name,
          price: currentProduct.basePrice,
          details: details.join(' | ') || 'Estándar',
          quantity: simpleProductQty
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Rama específica para Burrito (idéntica al Bowl, sin "La Base del Día")
      if (currentProduct.type === 'burrito') {
        let finalPrice = calculateModalTotal();
        let details = [];

        // Bases
        let baseParts = [];
        if (burrBaseQuantities.arroz > 0) baseParts.push(`Arroz del Día x${burrBaseQuantities.arroz}`);
        if (burrBaseQuantities.lechugas > 0) baseParts.push(`Lechuga Mix x${burrBaseQuantities.lechugas}`);
        if (baseParts.length > 0) details.push(`Bases: ${baseParts.join(', ')}`);

        // Proteína
        if (burrSelectedProtein) details.push(`Proteína: ${burrSelectedProtein.displayName}`);

        // Adición de Proteína
        let addProtNames = { carne: 'Carne Desmechada', cerdo: 'Cerdo Pulled Pork', costilla: 'Costilla Ahumada BBQ', tenders: 'Tender de Pechuga', chorizo: 'Chorizo de Cerdo' };
        let addProtParts = [];
        for (let k in burrAddProtQuantities) {
          if (burrAddProtQuantities[k] > 0) addProtParts.push(`${addProtNames[k]} x${burrAddProtQuantities[k]}`);
        }
        if (addProtParts.length > 0) details.push(`Adición Proteína: ${addProtParts.join(', ')}`);

        // Toppings incluidos
        let topNames = Object.values(burrSelectedTops).map(t => t.displayName);
        if (topNames.length > 0) details.push(`Toppings: ${topNames.join(', ')}`);

        // Adición de toppings
        let addTopNames = { chicharron: 'Chicharrón', chorizo: 'Topping del Día', maduro: 'Maizcitos', maicitos: 'Cebolla y Pimentón Encurtido', guacamole: 'Guacamole', pico: 'Pico de Gallo', doritox: 'Doritox', sour: 'Sour Cream', cebolla: 'Cebolla Crispy', queso: 'Queso Mozzarella', pepino: 'Pepino al Cilantro', jalapenos: 'Jalapeños' };
        let addTopParts = [];
        for (let k in burrAddTopQuantities) {
          if (burrAddTopQuantities[k] > 0) addTopParts.push(`${addTopNames[k]} x${burrAddTopQuantities[k]}`);
        }
        if (addTopParts.length > 0) details.push(`Adición Toppings: ${addTopParts.join(', ')}`);

        // Salsa Base
        if (burrSelectedSalsaBase) details.push(`Salsa: ${burrSelectedSalsaBase.displayName}`);

        // Adición de Salsas
        let addSalsaNames = { tatemada: 'Salsa Tatemada', ajo: 'Salsa de Ajo', bbq: 'Salsa BBQ' };
        let addSalsaParts = [];
        for (let k in burrAddSalsaQuantities) {
          if (burrAddSalsaQuantities[k] > 0) addSalsaParts.push(`${addSalsaNames[k]} x${burrAddSalsaQuantities[k]}`);
        }
        if (addSalsaParts.length > 0) details.push(`Adición Salsas: ${addSalsaParts.join(', ')}`);

        let comentariosBurrito = clampText(document.getElementById('burritoComentarios').value.trim(), 250);
        if (comentariosBurrito) details.push(`Comentarios: ${comentariosBurrito}`);

        cart.push({
          name: currentProduct.name,
          price: finalPrice,
          details: details.join(' | ') || 'Estándar',
          quantity: 1
        });

        updateCartBadge();
        closeProductModal();
        showSection('cart');
        return;
      }

      // Lógica del Bowl
      let finalPrice = calculateModalTotal();
      let details = [];

      // Bases
      let baseParts = [];
      if (baseQuantities.arroz > 0) baseParts.push(`Arroz del Día x${baseQuantities.arroz}`);
      if (baseQuantities.lechugas > 0) baseParts.push(`Lechuga Mix x${baseQuantities.lechugas}`);
      if (baseQuantities.dia > 0) baseParts.push(`La Base del Día x${baseQuantities.dia}`);
      if (baseParts.length > 0) details.push(`Bases: ${baseParts.join(', ')}`);

      // Proteína
      if (selectedProtein) details.push(`Proteína: ${selectedProtein.displayName}`);

      // Adición de Proteína
      let addProtNames = { carne: 'Carne Desmechada', cerdo: 'Cerdo Pulled Pork', costilla: 'Costilla Ahumada BBQ', tenders: 'Tender de Pechuga', chorizo: 'Chorizo de Cerdo' };
      let addProtParts = [];
      for (let k in addProtQuantities) {
        if (addProtQuantities[k] > 0) addProtParts.push(`${addProtNames[k]} x${addProtQuantities[k]}`);
      }
      if (addProtParts.length > 0) details.push(`Adición Proteína: ${addProtParts.join(', ')}`);

      // Toppings incluidos
      let topNames = Object.values(selectedTops).map(t => t.displayName);
      if (topNames.length > 0) details.push(`Toppings: ${topNames.join(', ')}`);

      // Adición de toppings
      let addTopNames = { chicharron: 'Chicharrón', chorizo: 'Topping del Día', maduro: 'Maizcitos', maicitos: 'Cebolla y Pimentón Encurtido', guacamole: 'Guacamole', pico: 'Pico de Gallo', doritox: 'Doritox', sour: 'Sour Cream', cebolla: 'Cebolla Crispy', queso: 'Queso Mozzarella', pepino: 'Pepino al Cilantro', jalapenos: 'Jalapeños' };
      let addTopParts = [];
      for (let k in addTopQuantities) {
        if (addTopQuantities[k] > 0) addTopParts.push(`${addTopNames[k]} x${addTopQuantities[k]}`);
      }
      if (addTopParts.length > 0) details.push(`Adición Toppings: ${addTopParts.join(', ')}`);

      // Salsa Base
      if (selectedSalsaBase) details.push(`Salsa: ${selectedSalsaBase.displayName}`);

      // Adición de Salsas
      let addSalsaNames = { tatemada: 'Salsa Tatemada', ajo: 'Salsa de Ajo', bbq: 'Salsa BBQ' };
      let addSalsaParts = [];
      for (let k in addSalsaQuantities) {
        if (addSalsaQuantities[k] > 0) addSalsaParts.push(`${addSalsaNames[k]} x${addSalsaQuantities[k]}`);
      }
      if (addSalsaParts.length > 0) details.push(`Adición Salsas: ${addSalsaParts.join(', ')}`);

      let comentariosBowl = clampText(document.getElementById('bowlComentarios').value.trim(), 250);
      if (comentariosBowl) details.push(`Comentarios: ${comentariosBowl}`);

      cart.push({
        name: currentProduct.name,
        price: finalPrice,
        details: details.join(' | ') || 'Estándar',
        quantity: 1
      });

      updateCartBadge();
      closeProductModal();
      showSection('cart');
    }

    function updateCartBadge() {
      document.getElementById('cartBadgeCount').innerText = cart.length;
    }

    // SEGURIDAD: renderCart ahora construye el DOM con createElement/textContent
    // en lugar de concatenar innerHTML con datos del usuario (fix de XSS).
    function renderCart() {
      const tbody = document.getElementById('cartTableBody');
      tbody.innerHTML = '';
      let subtotal = 0;

      cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;

        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = item.name; // seguro: textContent, no innerHTML
        tdName.appendChild(strong);

        const tdDetails = document.createElement('td');
        tdDetails.style.fontSize = '12px';
        tdDetails.style.textAlign = 'left';
        tdDetails.style.color = '#555';
        tdDetails.textContent = item.details; // seguro: textContent, no innerHTML

        const tdPrice = document.createElement('td');
        tdPrice.textContent = '$ ' + item.price.toLocaleString();

        const tdQty = document.createElement('td');
        tdQty.textContent = String(item.quantity);

        const tdTotal = document.createElement('td');
        tdTotal.textContent = '$ ' + (item.price * item.quantity).toLocaleString();

        const tdRemove = document.createElement('td');
        const btnRemove = document.createElement('button');
        btnRemove.textContent = 'X';
        btnRemove.style.background = 'var(--red)';
        btnRemove.style.color = 'white';
        btnRemove.style.border = 'none';
        btnRemove.style.padding = '6px 10px';
        btnRemove.style.borderRadius = '4px';
        btnRemove.style.cursor = 'pointer';
        btnRemove.addEventListener('click', () => removeFromCart(index));
        tdRemove.appendChild(btnRemove);

        tr.appendChild(tdName);
        tr.appendChild(tdDetails);
        tr.appendChild(tdPrice);
        tr.appendChild(tdQty);
        tr.appendChild(tdTotal);
        tr.appendChild(tdRemove);

        tbody.appendChild(tr);
      });

      document.getElementById('cartSubtotal').innerText = '$ ' + subtotal.toLocaleString();
    }

    function removeFromCart(index) {
      cart.splice(index, 1);
      updateCartBadge();
      renderCart();
    }

    // SEGURIDAD: validación básica de formato de teléfono colombiano
    // (defensa en profundidad; no reemplaza validación en un backend real)
    function isValidPhone(value) {
      const digitsOnly = value.replace(/[\s\-\+\(\)]/g, '');
      return /^\d{7,13}$/.test(digitsOnly);
    }

    function showCheckoutError(msg) {
      const el = document.getElementById('checkoutErrorNotice');
      el.textContent = msg;
      el.style.display = 'block';
    }

    function hideCheckoutError() {
      const el = document.getElementById('checkoutErrorNotice');
      el.style.display = 'none';
      el.textContent = '';
    }

    function sendOrderToWhatsApp(e) {
      e.preventDefault();
      hideCheckoutError();

      if (cart.length === 0) {
        showCheckoutError('Tu canasta está vacía.');
        return;
      }

      // Datos del cliente (recortados como defensa adicional además del maxlength del HTML)
      let nombre = clampText(document.getElementById('nombre').value.trim(), 80);
      let whatsapp = clampText(document.getElementById('whatsapp').value.trim(), 20);
      let direccion = clampText(document.getElementById('direccion').value.trim(), 150);
      let barrio = clampText(document.getElementById('barrio').value.trim(), 80);
      let referencia = clampText(document.getElementById('referencia').value.trim(), 150);
      let pago = document.getElementById('pago').value;
      let observaciones = clampText(document.getElementById('observaciones').value.trim(), 300);

      // SEGURIDAD: validación de campos obligatorios en el cliente
      // (recordatorio: esto NO sustituye validación en servidor si en el futuro
      // se procesa el pedido de forma automática)
      if (!nombre || !whatsapp || !direccion || !barrio || !pago) {
        showCheckoutError('Por favor completa todos los campos obligatorios (*).');
        return;
      }

      if (!isValidPhone(whatsapp)) {
        showCheckoutError('Por favor ingresa un número de WhatsApp válido.');
        return;
      }

      const submitBtn = document.getElementById('submitOrderBtn');
      submitBtn.disabled = true;

      // El mensaje de WhatsApp es texto plano (no HTML), por lo que no hay
      // riesgo de XSS aquí; igualmente usamos los valores ya recortados arriba.
      //
      // NOTA: item.details llega ya armado desde addToCart() como un único
      // string con segmentos separados por " | " (ej: "Bases: ... | Proteína: ...
      // | Toppings: ... | Salsa: ... | Comentarios: ..."). Esa lógica NO se toca.
      // Aquí solo se "desarma" ese string para imprimir cada sección, mostrando
      // las listas como un único párrafo con comas (igual a como se ve en la
      // vista previa del carrito), en vez de una línea por cada ítem.
      const LIST_LABELS = ['Bases', 'Toppings', 'Adición Proteína', 'Adición Toppings', 'Adición Salsas'];

      function buildConfigLines(details) {
        const out = [];
        if (!details || details === 'Estándar') {
          out.push('Estándar');
          out.push('');
          return out;
        }

        details.split(' | ').forEach(segment => {
          const sep = segment.indexOf(': ');
          if (sep === -1) return;
          const label = segment.substring(0, sep);
          const value = segment.substring(sep + 2);

          if (label === 'Salsa' || label === 'Comentarios') {
            // Formato de una sola línea: "Salsa: Salsa BBQ"
            out.push(`${label}: ${value}`);
            out.push('');
          } else {
            // Ej. "Bases", "Proteína", "Toppings", "Adición Proteína",
            // "Adición Toppings", "Adición Salsas": el label va en su propia
            // línea y el valor completo (con comas) va debajo, en un solo
            // párrafo, tal como aparece en la canasta.
            out.push(`${label}:`);
            out.push(value);
            out.push('');
          }
        });

        return out;
      }

      let lines = [];
      lines.push('¡Nuevo Pedido - Dominio & Coffee!');
      lines.push(`Nombre: ${nombre}`);
      lines.push(`Teléfono: ${whatsapp}`);
      lines.push(`Dirección: ${direccion}`);
      lines.push(`Barrio: ${barrio}`);
      if (referencia) lines.push(`Referencia: ${referencia}`);
      lines.push(`Método de pago: ${pago}`);
      lines.push('');
      lines.push('--- DETALLE DEL PEDIDO ---');
      lines.push('');

      let subtotal = 0;
      cart.forEach((item, idx) => {
        let itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        lines.push(`${idx + 1}. ${item.name}`);
        lines.push('');
        lines.push('Configuración:');
        lines = lines.concat(buildConfigLines(item.details));

        lines.push(`Cantidad: ${item.quantity}`);
        lines.push(`Precio unit.: $${item.price.toLocaleString('es-CO')}`);
        lines.push(`Subtotal: $${itemTotal.toLocaleString('es-CO')}`);
        lines.push('');
      });

      lines.push(`Subtotal: $${subtotal.toLocaleString('es-CO')}`);
      if (observaciones) lines.push(`Observaciones: ${observaciones}`);
      lines.push(`Total a pagar: $${subtotal.toLocaleString('es-CO')}`);

      let mensaje = lines.join('\n');

      // encodeURIComponent ya escapa el texto para uso seguro en la URL
      let url = `https://wa.me/573246044424?text=${encodeURIComponent(mensaje)}`;

      // SEGURIDAD: noopener,noreferrer evita "reverse tabnabbing"
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;

      submitBtn.disabled = false;
    }

    
    updateStoreStatus();
    setInterval(updateStoreStatus, 60000);