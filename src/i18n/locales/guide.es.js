// Guided tours and help center. Kept apart from es.js because of its size; spread into it.
export default {
  tour: {
    next: 'Siguiente',
    prev: 'Anterior',
    done: 'Entendido',
    skip: 'Saltar guía',
    progress: '{current} de {total}',
    welcome: {
      intro: {
        title: '¡Bienvenido a Knexura Finanzas! 👋',
        body: 'Te mostramos en un minuto cómo está organizada la app para que empieces a controlar tu dinero. Puedes saltar esta guía cuando quieras.',
      },
      summary: {
        title: 'Tu resumen del mes',
        body: 'Aquí ves tu patrimonio, tus ingresos y gastos del mes y cuánto te queda disponible. Se actualiza solo con cada movimiento que registras.',
      },
      quick: {
        title: 'Acciones rápidas',
        body: 'Atajos para lo que más harás: registrar un movimiento, crear un presupuesto, ver reportes o simular un crédito.',
      },
      nav: {
        title: 'Navegación',
        body: 'Desde aquí llegas a todos los módulos de la app. Están agrupados en vista general, planificación y cuenta.',
      },
      transactions: {
        title: 'Movimientos',
        body: 'El corazón de la app: registra cada ingreso y gasto a mano, por voz, escaneando una factura o importando el extracto de tu banco.',
      },
      wallets: {
        title: 'Cuentas',
        body: 'Crea tus cuentas (efectivo, banco o tarjeta de crédito) para saber cuánto tienes en cada una. Te recomendamos empezar por aquí.',
      },
      planning: {
        title: 'Planificación',
        body: 'Presupuestos, metas de ahorro, créditos, pagos recurrentes y simuladores te ayudan a planear en lugar de solo registrar.',
      },
      ai: {
        title: 'Asistente con IA',
        body: 'Pregúntale lo que quieras sobre tus finanzas: en qué gastas más, si te alcanza para algo o cómo ahorrar más.',
      },
      help: {
        title: '¿Necesitas ayuda?',
        body: 'Desde este botón puedes repetir la guía de cada pantalla o abrir el centro de ayuda con instrucciones paso a paso.',
      },
    },
    transactions: {
      intro: {
        title: 'Tus movimientos',
        body: 'Aquí queda el historial de todo lo que entra y sale de tus cuentas. Cada movimiento actualiza el saldo de la cuenta y tus reportes.',
      },
      add: {
        title: 'Registrar un movimiento',
        body: 'Toca aquí y elige cómo hacerlo: digitarlo, escanear una factura o recibo, o subir el extracto PDF de tu banco para importar varios de una vez.',
      },
      form: {
        title: 'Qué información pide',
        body: 'Elige si es ingreso o gasto, el monto, la categoría, la cuenta y la fecha. Si activaste la IA, te sugiere la categoría y puedes dictar el movimiento por voz.',
      },
      filters: {
        title: 'Filtros',
        body: 'Busca por tipo, categoría o rango de fechas. También puedes seleccionar varios movimientos para exportarlos o eliminarlos juntos.',
      },
      export: {
        title: 'Exportar',
        body: 'Descarga tus movimientos en CSV para abrirlos en Excel o compartirlos con tu contador.',
      },
    },
    wallets: {
      intro: {
        title: 'Tus cuentas',
        body: 'Cada cuenta representa dónde está tu dinero: efectivo, cuenta bancaria o tarjeta de crédito.',
      },
      add: {
        title: 'Crear una cuenta',
        body: 'Ponle un nombre, elige el tipo y el saldo inicial. Para tarjetas de crédito puedes indicar el cupo y las fechas de corte y pago. Si tu banco lo permite, puedes conectarla para sincronizarla.',
      },
      networth: {
        title: 'Patrimonio total',
        body: 'La suma de todas tus cuentas menos lo que debes en tarjetas. Te avisa si alguna cuenta quedó en negativo.',
      },
      transfer: {
        title: 'Transferir entre cuentas',
        body: 'Mueve dinero de una cuenta a otra (por ejemplo, del banco al efectivo) sin que cuente como gasto ni como ingreso.',
      },
      balance: {
        title: 'Saldos automáticos',
        body: 'No tienes que actualizar los saldos a mano: cada movimiento que registras en una cuenta la ajusta sola.',
      },
    },
    credits: {
      intro: {
        title: 'Créditos y deudas',
        body: 'Lleva el control de tus préstamos: cuánto debes, cuánto has pagado y cuándo terminas.',
      },
      add: {
        title: 'Registrar un crédito',
        body: 'Un formulario de tres pasos: datos del crédito, saldo y tasas, y fechas. Con eso calculamos tu plan de pagos.',
      },
      payment: {
        title: 'Registrar pagos',
        body: 'Cada vez que pagues una cuota o hagas un abono extra, regístralo aquí para ver cómo baja la deuda.',
      },
      plan: {
        title: 'Plan y consejos',
        body: 'En cada crédito ves la tabla de amortización, alertas si la tasa es alta y consejos para pagarlo más rápido.',
      },
    },
    budgets: {
      intro: {
        title: 'Presupuestos',
        body: 'Define cuánto quieres gastar como máximo en cada categoría al mes.',
      },
      add: {
        title: 'Crear un presupuesto',
        body: 'Elige la categoría, el mes y el monto límite.',
      },
      ai: {
        title: 'Presupuesto recomendado',
        body: 'Si activaste la IA, dentro del formulario puedes pedir un monto sugerido según lo que sueles gastar en esa categoría.',
      },
      track: {
        title: 'Seguimiento',
        body: 'La barra de cada presupuesto se llena con tus gastos del mes y cambia de color cuando te acercas al límite o lo superas.',
      },
    },
    goals: {
      intro: {
        title: 'Metas de ahorro',
        body: 'Ahorra con un propósito: un viaje, un fondo de emergencia o la cuota inicial de tu casa.',
      },
      add: {
        title: 'Crear una meta',
        body: 'Ponle nombre, el monto objetivo y una fecha límite.',
      },
      progress: {
        title: 'Sumar avance',
        body: 'Cada vez que apartes dinero para tu meta, agrégalo aquí y verás el porcentaje de avance.',
      },
    },
    simulators: {
      intro: {
        title: 'Simuladores',
        body: 'Antes de tomar una decisión financiera, simúlala con tus números reales.',
      },
      tabs: {
        title: 'Tipos de simulación',
        body: 'Simula un crédito (cuota e intereses), un CDT (rendimiento), un plan de ahorro o tu capacidad de endeudamiento.',
      },
      capacity: {
        title: 'Capacidad de endeudamiento',
        body: 'Usamos tus ingresos y gastos registrados para calcular qué cuota podrías pagar sin apretarte, y si te conviene una nueva tarjeta.',
      },
    },
    recurring: {
      intro: {
        title: 'Pagos recurrentes',
        body: 'Arriendo, servicios, suscripciones o tu salario: todo lo que se repite.',
      },
      add: {
        title: 'Programar un recurrente',
        body: 'Indica el monto, la categoría, la cuenta y la frecuencia (diaria, semanal, mensual o anual). Se registrará automáticamente en cada fecha.',
      },
      upcoming: {
        title: 'Próximos pagos',
        body: 'Aquí ves lo que viene para que ningún pago te tome por sorpresa.',
      },
    },
    categories: {
      intro: {
        title: 'Categorías',
        body: 'Clasifican tus movimientos para que los reportes y presupuestos tengan sentido. Ya tienes unas por defecto.',
      },
      tabs: {
        title: 'Ingresos y gastos',
        body: 'Filtra para ver solo las categorías de ingreso o de gasto.',
      },
      add: {
        title: 'Crear una categoría',
        body: 'Ponle nombre, tipo, color e ícono. Si activaste la IA, puede proponerte un ícono.',
      },
    },
    reports: {
      intro: {
        title: 'Reportes',
        body: 'Entiende a dónde va tu dinero con gráficos claros.',
      },
      tabs: {
        title: 'Vistas del reporte',
        body: 'Mensual para el detalle de un mes, anual para ver la tendencia y análisis inteligente para patrones, alertas y recomendaciones de la IA.',
      },
      period: {
        title: 'Cambiar el periodo',
        body: 'Elige el mes que quieres revisar.',
      },
    },
    profile: {
      intro: {
        title: 'Tu perfil',
        body: 'Aquí ajustas tu cuenta, la seguridad y la privacidad.',
      },
      personal: {
        title: 'Información personal',
        body: 'Cambia tu nombre, idioma, moneda y país. La moneda define cómo se muestran todos los montos.',
      },
      security: {
        title: 'Seguridad',
        body: 'Activa la verificación en dos pasos y, en tu celular, el ingreso con Face ID o huella.',
      },
      ai: {
        title: 'Privacidad e IA',
        body: 'Revisa o revoca en cualquier momento el permiso para usar funciones de inteligencia artificial.',
      },
    },
  },
  help: {
    menuLabel: 'Ayuda',
    screenGuide: 'Ver guía de esta pantalla',
    replayWelcome: 'Repetir recorrido de bienvenida',
    center: 'Centro de ayuda',
    eyebrow: 'Soporte',
    title: 'Centro de ayuda',
    subtitle: 'Aprende a usar cada módulo paso a paso o repite las guías interactivas.',
    searchPlaceholder: 'Buscar: presupuesto, transferir, exportar…',
    noResults: 'No encontramos resultados para tu búsqueda.',
    firstStepsTitle: 'Primeros pasos',
    firstStepsSubtitle: 'El orden que recomendamos para una cuenta nueva',
    firstSteps: {
      wallet: { title: 'Crea tus cuentas', body: 'Efectivo, banco y tarjetas, con su saldo actual.' },
      transaction: { title: 'Registra tu primer movimiento', body: 'Un gasto o ingreso de hoy.' },
      budget: { title: 'Define un presupuesto', body: 'Empieza por la categoría en la que más gastas.' },
      goal: { title: 'Crea una meta de ahorro', body: 'Algo concreto con fecha y monto.' },
    },
    guidesTitle: 'Guías por módulo',
    goToScreen: 'Ir a la pantalla',
    startTour: 'Ver recorrido guiado',
    faqTitle: 'Preguntas frecuentes',
    resetTitle: 'Guías interactivas',
    resetBody: 'Vuelve a ver las guías de cada pantalla la próxima vez que entres a ella.',
    resetButton: 'Reiniciar todas las guías',
    resetDone: 'Listo. Las guías volverán a aparecer.',
    resetError: 'No se pudieron reiniciar las guías',
    articles: {
      dashboard: {
        title: 'Inicio',
        summary: 'Tu resumen financiero del mes en una sola pantalla.',
        steps: [
          'Revisa tu patrimonio y cuánto te queda disponible este mes.',
          'Compara tus ingresos y gastos del mes.',
          'Usa las acciones rápidas para registrar un movimiento o crear un presupuesto.',
          'Consulta tu índice de salud financiera y los consejos de la IA (si la activaste).',
          'Revisa los próximos pagos y en qué categorías gastas más.',
        ],
      },
      transactions: {
        title: 'Movimientos',
        summary: 'Registrar, buscar, editar y exportar ingresos y gastos.',
        steps: [
          'Toca "Nuevo movimiento" (o el botón + en el celular).',
          'Elige cómo registrarlo: digitarlo, escanear una factura o subir el extracto PDF del banco.',
          'Completa tipo, monto, categoría, cuenta y fecha, y guarda.',
          'Para editar o eliminar, toca el movimiento en la lista.',
          'Usa los filtros para buscar por tipo, categoría o fechas, y exporta a CSV cuando lo necesites.',
        ],
      },
      wallets: {
        title: 'Cuentas',
        summary: 'Dónde está tu dinero: efectivo, bancos y tarjetas.',
        steps: [
          'Toca "Nueva cuenta" y elige el tipo: efectivo, banco o crédito.',
          'Escribe el nombre y el saldo actual. En tarjetas, agrega el cupo y las fechas de corte y pago.',
          'Si tu banco está disponible, conéctalo para sincronizar la cuenta.',
          'Para mover dinero entre cuentas usa "Transferir": no cuenta como gasto.',
          'Los saldos se actualizan solos con cada movimiento.',
        ],
      },
      budgets: {
        title: 'Presupuestos',
        summary: 'Ponle un límite mensual a cada categoría.',
        steps: [
          'Toca "Nuevo presupuesto".',
          'Elige la categoría, el mes y el monto máximo.',
          'Si activaste la IA, pide un monto recomendado según tu historial.',
          'Sigue la barra de avance: cambia de color al acercarte o pasarte del límite.',
        ],
      },
      goals: {
        title: 'Metas de ahorro',
        summary: 'Ahorra para algo concreto y mide tu avance.',
        steps: [
          'Toca "Nueva meta" y ponle nombre, monto objetivo y fecha.',
          'Cada vez que ahorres, usa "Agregar" en la meta para sumar el avance.',
          'Revisa el porcentaje para saber si vas a tiempo.',
        ],
      },
      credits: {
        title: 'Créditos',
        summary: 'Préstamos y deudas bajo control.',
        steps: [
          'Toca "Registrar crédito".',
          'Paso 1: datos del crédito (tipo, entidad, monto).',
          'Paso 2: saldo actual y tasas de interés.',
          'Paso 3: fechas y notas. Guardamos y calculamos el plan de pagos.',
          'Registra cada cuota o abono extra con "Registrar pago".',
        ],
      },
      recurring: {
        title: 'Recurrentes',
        summary: 'Pagos e ingresos que se repiten, registrados solos.',
        steps: [
          'Toca "Nuevo recurrente".',
          'Indica monto, categoría, cuenta, frecuencia y fecha de inicio.',
          'Se registrará automáticamente en cada fecha.',
          'Revisa los próximos pagos en la parte superior.',
        ],
      },
      categories: {
        title: 'Categorías',
        summary: 'Organiza tus movimientos a tu manera.',
        steps: [
          'Ya tienes categorías por defecto; puedes editarlas o crear nuevas.',
          'Toca "Nueva categoría" y elige nombre, tipo (ingreso o gasto), color e ícono.',
          'Usa las pestañas para ver solo ingresos o solo gastos.',
        ],
      },
      simulators: {
        title: 'Simuladores',
        summary: 'Prueba escenarios antes de decidir.',
        steps: [
          'Elige la pestaña: crédito, CDT, ahorro o capacidad.',
          'Completa los datos del escenario.',
          'Revisa el resultado: cuota, intereses, rendimiento o capacidad de pago.',
          'La capacidad se calcula con tus movimientos reales, así que mientras más registres, más precisa es.',
        ],
      },
      reports: {
        title: 'Reportes',
        summary: 'Gráficos y análisis de tus finanzas.',
        steps: [
          'En "Mensual" elige el mes para ver ingresos, gastos y presupuestos.',
          'En "Anual" compara mes a mes la tendencia del año.',
          'En "Análisis inteligente" la IA detecta patrones, gastos inusuales y te da recomendaciones.',
        ],
      },
      profile: {
        title: 'Perfil y seguridad',
        summary: 'Tu cuenta, seguridad y privacidad.',
        steps: [
          'Cambia nombre, idioma, moneda y país en "Información personal".',
          'Cambia tu contraseña y activa la verificación en dos pasos.',
          'En el celular, activa el ingreso con Face ID o huella.',
          'Revisa o revoca el permiso de IA en "Privacidad e IA".',
          'Descarga una copia de tus datos o elimina tu cuenta al final de la página.',
        ],
      },
    },
    faq: {
      ai: {
        q: '¿Para qué sirve la IA y es obligatoria?',
        a: 'La IA escanea facturas, lee extractos PDF, sugiere categorías y presupuestos y responde el chat. No es obligatoria: sin ella puedes usar todo lo demás. Puedes activarla o desactivarla desde Mi perfil.',
      },
      privacy: {
        q: '¿Qué pasa con mis datos si uso la IA?',
        a: 'Solo se envía al proveedor de IA lo necesario para la función que usas (la imagen del recibo, el extracto o tu mensaje). Si revocas el permiso, se borra tu historial de chat y análisis.',
      },
      trial: {
        q: '¿Cómo funciona el periodo de prueba?',
        a: 'Al registrarte tienes un periodo gratuito con todas las funciones. Puedes ver cuántos días te quedan y activar tu plan en "Plan y facturación".',
      },
      readOnly: {
        q: '¿Qué pasa si se termina mi prueba o mi suscripción?',
        a: 'Tus datos no se borran: quedan en modo solo lectura. Puedes verlos, pero para crear, editar o eliminar necesitas una suscripción activa.',
      },
      security: {
        q: '¿Cómo protejo mi cuenta?',
        a: 'Activa la verificación en dos pasos en Mi perfil. En el celular también puedes ingresar con Face ID o huella. Si cambias la contraseña, se cierra la sesión en los demás dispositivos.',
      },
      export: {
        q: '¿Puedo sacar mis datos de la app?',
        a: 'Sí. En Movimientos puedes exportar a CSV, y en Mi perfil puedes descargar una copia completa de tu información.',
      },
      currency: {
        q: '¿Cómo cambio la moneda o el idioma?',
        a: 'En Mi perfil, sección Información personal. El cambio se aplica en todos tus dispositivos.',
      },
      bank: {
        q: '¿Puedo conectar mi banco?',
        a: 'Al crear una cuenta de tipo banco o crédito puedes conectarla si tu entidad está disponible. Si no, puedes importar el extracto PDF desde Movimientos.',
      },
    },
  },
}
