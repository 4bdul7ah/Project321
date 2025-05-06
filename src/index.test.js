document.body.innerHTML = '<div id="root"></div>';

jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(() => ({})),
}));
jest.mock('firebase/analytics', () => ({
    getAnalytics: jest.fn(() => ({})),
}));
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({})),
}));
jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    Timestamp: {
        fromDate: jest.fn(() => ({
            seconds: 0,
            toDate: () => new Date(),
        })),
    },
}));

//mock DOM wont run wo
test('renders without crashing', () => {
    require('./index');
    expect(true).toBe(true);
});
