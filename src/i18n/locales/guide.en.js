// Guided tours and help center. Kept apart from en.js because of its size; spread into it.
export default {
  tour: {
    next: 'Next',
    prev: 'Back',
    done: 'Got it',
    skip: 'Skip guide',
    progress: '{current} of {total}',
    welcome: {
      intro: {
        title: 'Welcome to Knexura Finanzas! 👋',
        body: 'Here is a one-minute look at how the app is organized so you can start managing your money. You can skip this guide at any time.',
      },
      summary: {
        title: 'Your month at a glance',
        body: 'See your net worth, this month\'s income and expenses, and how much you have left. It updates with every transaction you log.',
      },
      quick: {
        title: 'Quick actions',
        body: 'Shortcuts for what you\'ll do most: log a transaction, create a budget, view reports or simulate a loan.',
      },
      nav: {
        title: 'Navigation',
        body: 'Every module of the app is reachable from here, grouped into overview, planning and account.',
      },
      transactions: {
        title: 'Transactions',
        body: 'The heart of the app: log every income and expense by hand, by voice, by scanning a receipt or by importing your bank statement.',
      },
      wallets: {
        title: 'Accounts',
        body: 'Create your accounts (cash, bank or credit card) to know how much you have in each. We recommend starting here.',
      },
      planning: {
        title: 'Planning',
        body: 'Budgets, savings goals, credits, recurring payments and simulators help you plan ahead instead of just keeping records.',
      },
      ai: {
        title: 'AI assistant',
        body: 'Ask anything about your finances: where you spend the most, whether you can afford something, or how to save more.',
      },
      help: {
        title: 'Need help?',
        body: 'Use this button to replay the guide for any screen or open the help center with step-by-step instructions.',
      },
    },
    transactions: {
      intro: {
        title: 'Your transactions',
        body: 'The history of everything coming in and going out of your accounts. Each transaction updates the account balance and your reports.',
      },
      add: {
        title: 'Log a transaction',
        body: 'Tap here and choose how: type it in, scan an invoice or receipt, or upload your bank\'s PDF statement to import several at once.',
      },
      form: {
        title: 'What it asks for',
        body: 'Choose income or expense, the amount, category, account and date. If you enabled AI, it suggests the category and you can dictate the transaction by voice.',
      },
      filters: {
        title: 'Filters',
        body: 'Search by type, category or date range. You can also select several transactions to export or delete them together.',
      },
      export: {
        title: 'Export',
        body: 'Download your transactions as CSV to open them in Excel or share them with your accountant.',
      },
    },
    wallets: {
      intro: {
        title: 'Your accounts',
        body: 'Each account represents where your money is: cash, a bank account or a credit card.',
      },
      add: {
        title: 'Create an account',
        body: 'Give it a name, choose the type and the starting balance. For credit cards you can set the limit and the statement and payment dates. If your bank supports it, you can connect it to sync.',
      },
      networth: {
        title: 'Total net worth',
        body: 'The sum of all your accounts minus what you owe on cards. It warns you if any account went negative.',
      },
      transfer: {
        title: 'Transfer between accounts',
        body: 'Move money from one account to another (for example, bank to cash) without it counting as an expense or income.',
      },
      balance: {
        title: 'Automatic balances',
        body: 'No need to update balances by hand: every transaction you log on an account adjusts it.',
      },
    },
    credits: {
      intro: {
        title: 'Credits and debts',
        body: 'Keep track of your loans: how much you owe, how much you\'ve paid and when you\'ll be done.',
      },
      add: {
        title: 'Register a credit',
        body: 'A three-step form: credit details, balance and rates, and dates. From that we calculate your payment plan.',
      },
      payment: {
        title: 'Register payments',
        body: 'Each time you pay an installment or make an extra payment, log it here to watch the debt go down.',
      },
      plan: {
        title: 'Plan and tips',
        body: 'Each credit shows its amortization table, warnings when the rate is high, and tips to pay it off faster.',
      },
    },
    budgets: {
      intro: {
        title: 'Budgets',
        body: 'Set the most you want to spend on each category per month.',
      },
      add: {
        title: 'Create a budget',
        body: 'Choose the category, the month and the limit.',
      },
      ai: {
        title: 'Recommended budget',
        body: 'If you enabled AI, the form can suggest an amount based on what you usually spend in that category.',
      },
      track: {
        title: 'Tracking',
        body: 'Each budget\'s bar fills with the month\'s expenses and changes color as you approach or exceed the limit.',
      },
    },
    goals: {
      intro: {
        title: 'Savings goals',
        body: 'Save with a purpose: a trip, an emergency fund or a down payment on a home.',
      },
      add: {
        title: 'Create a goal',
        body: 'Give it a name, a target amount and a deadline.',
      },
      progress: {
        title: 'Add progress',
        body: 'Every time you set money aside for the goal, add it here and watch the percentage grow.',
      },
    },
    simulators: {
      intro: {
        title: 'Simulators',
        body: 'Before making a financial decision, simulate it with your real numbers.',
      },
      tabs: {
        title: 'Simulation types',
        body: 'Simulate a loan (installment and interest), a term deposit (returns), a savings plan or your borrowing capacity.',
      },
      capacity: {
        title: 'Borrowing capacity',
        body: 'We use your logged income and expenses to estimate an installment you could comfortably pay, and whether a new card makes sense.',
      },
    },
    recurring: {
      intro: {
        title: 'Recurring payments',
        body: 'Rent, utilities, subscriptions or your salary: anything that repeats.',
      },
      add: {
        title: 'Schedule a recurring item',
        body: 'Set the amount, category, account and frequency (daily, weekly, monthly or yearly). It will be logged automatically on each date.',
      },
      upcoming: {
        title: 'Upcoming payments',
        body: 'See what\'s coming so no payment catches you off guard.',
      },
    },
    categories: {
      intro: {
        title: 'Categories',
        body: 'They classify your transactions so reports and budgets make sense. You already have a default set.',
      },
      tabs: {
        title: 'Income and expenses',
        body: 'Filter to see only income or only expense categories.',
      },
      add: {
        title: 'Create a category',
        body: 'Choose a name, type, color and icon. If you enabled AI, it can suggest an icon.',
      },
    },
    reports: {
      intro: {
        title: 'Reports',
        body: 'Understand where your money goes with clear charts.',
      },
      tabs: {
        title: 'Report views',
        body: 'Monthly for a single month in detail, yearly to see the trend, and smart analysis for AI patterns, alerts and recommendations.',
      },
      period: {
        title: 'Change the period',
        body: 'Pick the month you want to review.',
      },
    },
    profile: {
      intro: {
        title: 'Your profile',
        body: 'Adjust your account, security and privacy here.',
      },
      personal: {
        title: 'Personal information',
        body: 'Change your name, language, currency and country. The currency defines how every amount is shown.',
      },
      security: {
        title: 'Security',
        body: 'Turn on two-step verification and, on your phone, sign in with Face ID or fingerprint.',
      },
      ai: {
        title: 'Privacy and AI',
        body: 'Review or revoke permission to use AI features at any time.',
      },
    },
  },
  help: {
    menuLabel: 'Help',
    screenGuide: 'Show guide for this screen',
    replayWelcome: 'Replay welcome tour',
    center: 'Help center',
    eyebrow: 'Support',
    title: 'Help center',
    subtitle: 'Learn each module step by step or replay the interactive guides.',
    searchPlaceholder: 'Search: budget, transfer, export…',
    noResults: 'No results match your search.',
    firstStepsTitle: 'First steps',
    firstStepsSubtitle: 'The order we recommend for a new account',
    firstSteps: {
      wallet: { title: 'Create your accounts', body: 'Cash, bank and cards, with their current balance.' },
      transaction: { title: 'Log your first transaction', body: 'An expense or income from today.' },
      budget: { title: 'Set a budget', body: 'Start with the category you spend the most on.' },
      goal: { title: 'Create a savings goal', body: 'Something specific with a date and amount.' },
    },
    guidesTitle: 'Guides by module',
    goToScreen: 'Go to screen',
    startTour: 'Start guided tour',
    faqTitle: 'Frequently asked questions',
    resetTitle: 'Interactive guides',
    resetBody: 'See each screen\'s guide again the next time you open it.',
    resetButton: 'Reset all guides',
    resetDone: 'Done. The guides will show again.',
    resetError: 'Could not reset the guides',
    articles: {
      dashboard: {
        title: 'Home',
        summary: 'Your monthly financial summary on a single screen.',
        steps: [
          'Check your net worth and how much you have left this month.',
          'Compare this month\'s income and expenses.',
          'Use quick actions to log a transaction or create a budget.',
          'See your financial health score and AI tips (if enabled).',
          'Review upcoming payments and where you spend the most.',
        ],
      },
      transactions: {
        title: 'Transactions',
        summary: 'Log, search, edit and export income and expenses.',
        steps: [
          'Tap "New transaction" (or the + button on your phone).',
          'Choose how to log it: type it in, scan a receipt or upload the bank\'s PDF statement.',
          'Fill in type, amount, category, account and date, then save.',
          'To edit or delete, tap the transaction in the list.',
          'Use filters to search by type, category or dates, and export to CSV when you need it.',
        ],
      },
      wallets: {
        title: 'Accounts',
        summary: 'Where your money is: cash, banks and cards.',
        steps: [
          'Tap "New account" and choose the type: cash, bank or credit.',
          'Enter the name and current balance. For cards, add the limit and statement and payment dates.',
          'If your bank is available, connect it to sync the account.',
          'To move money between accounts use "Transfer": it doesn\'t count as an expense.',
          'Balances update automatically with every transaction.',
        ],
      },
      budgets: {
        title: 'Budgets',
        summary: 'Put a monthly limit on each category.',
        steps: [
          'Tap "New budget".',
          'Choose the category, the month and the maximum amount.',
          'If you enabled AI, ask for a recommended amount based on your history.',
          'Follow the progress bar: it changes color as you approach or exceed the limit.',
        ],
      },
      goals: {
        title: 'Savings goals',
        summary: 'Save for something specific and track your progress.',
        steps: [
          'Tap "New goal" and give it a name, target amount and date.',
          'Each time you save, use "Add" on the goal to record progress.',
          'Check the percentage to know whether you\'re on track.',
        ],
      },
      credits: {
        title: 'Credits',
        summary: 'Loans and debts under control.',
        steps: [
          'Tap "Register credit".',
          'Step 1: credit details (type, lender, amount).',
          'Step 2: current balance and interest rates.',
          'Step 3: dates and notes. We save it and build the payment plan.',
          'Log each installment or extra payment with "Register payment".',
        ],
      },
      recurring: {
        title: 'Recurring',
        summary: 'Repeating payments and income, logged for you.',
        steps: [
          'Tap "New recurring".',
          'Set amount, category, account, frequency and start date.',
          'It will be logged automatically on each date.',
          'Check upcoming payments at the top.',
        ],
      },
      categories: {
        title: 'Categories',
        summary: 'Organize your transactions your way.',
        steps: [
          'You already have default categories; you can edit them or create new ones.',
          'Tap "New category" and choose name, type (income or expense), color and icon.',
          'Use the tabs to see only income or only expenses.',
        ],
      },
      simulators: {
        title: 'Simulators',
        summary: 'Try scenarios before deciding.',
        steps: [
          'Pick a tab: loan, term deposit, savings or capacity.',
          'Fill in the scenario details.',
          'Review the result: installment, interest, returns or payment capacity.',
          'Capacity is calculated from your real transactions, so the more you log, the more accurate it is.',
        ],
      },
      reports: {
        title: 'Reports',
        summary: 'Charts and analysis of your finances.',
        steps: [
          'In "Monthly", pick a month to see income, expenses and budgets.',
          'In "Yearly", compare the year\'s trend month by month.',
          'In "Smart analysis", AI detects patterns and unusual spending and gives you recommendations.',
        ],
      },
      profile: {
        title: 'Profile and security',
        summary: 'Your account, security and privacy.',
        steps: [
          'Change name, language, currency and country under "Personal information".',
          'Change your password and turn on two-step verification.',
          'On your phone, turn on Face ID or fingerprint sign-in.',
          'Review or revoke AI permission under "Privacy and AI".',
          'Download a copy of your data or delete your account at the bottom of the page.',
        ],
      },
    },
    faq: {
      ai: {
        q: 'What is AI used for, and is it required?',
        a: 'AI scans receipts, reads PDF statements, suggests categories and budgets, and answers the chat. It\'s optional: everything else works without it. You can turn it on or off in My profile.',
      },
      privacy: {
        q: 'What happens to my data if I use AI?',
        a: 'Only what the feature needs is sent to the AI provider (the receipt image, the statement or your message). If you revoke permission, your chat and analysis history is deleted.',
      },
      trial: {
        q: 'How does the trial work?',
        a: 'When you sign up you get a free period with every feature. See how many days are left and activate your plan under "Plan & billing".',
      },
      readOnly: {
        q: 'What happens when my trial or subscription ends?',
        a: 'Your data isn\'t deleted: it becomes read-only. You can still view it, but creating, editing or deleting needs an active subscription.',
      },
      security: {
        q: 'How do I protect my account?',
        a: 'Turn on two-step verification in My profile. On your phone you can also sign in with Face ID or fingerprint. Changing your password signs out your other devices.',
      },
      export: {
        q: 'Can I get my data out of the app?',
        a: 'Yes. Export to CSV from Transactions, and download a full copy of your information from My profile.',
      },
      currency: {
        q: 'How do I change the currency or language?',
        a: 'In My profile, under Personal information. The change applies on all your devices.',
      },
      bank: {
        q: 'Can I connect my bank?',
        a: 'When creating a bank or credit account you can connect it if your institution is available. Otherwise, import the PDF statement from Transactions.',
      },
    },
  },
}
