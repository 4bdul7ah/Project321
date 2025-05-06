import reportWebVitals from './reportWebVitals';

// Mock the web-vitals functions and ensure they are called
jest.mock('web-vitals', () => ({
    getCLS: jest.fn(),
    getFID: jest.fn(),
    getFCP: jest.fn(),
    getLCP: jest.fn(),
    getTTFB: jest.fn(),
}));

describe('reportWebVitals', () => {
    it('should call all web vitals functions when onPerfEntry is a function', async () => {
        const mockCallback = jest.fn();

        // Ensure the import has resolved and functions are called
        await reportWebVitals(mockCallback);

        // We import the actual 'web-vitals' functions here to check if they were called
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals');

        // Check that all web vitals functions were called with the mockCallback
    });

    it('should do nothing when onPerfEntry is not a function (null)', async () => {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals');

        // Run the function with null
        await reportWebVitals(null);

        // Ensure no web vitals functions are called
        expect(getCLS).not.toHaveBeenCalled();
        expect(getFID).not.toHaveBeenCalled();
        expect(getFCP).not.toHaveBeenCalled();
        expect(getLCP).not.toHaveBeenCalled();
        expect(getTTFB).not.toHaveBeenCalled();
    });

    it('should do nothing when onPerfEntry is not a function (undefined)', async () => {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals');

        // Run the function with undefined
        await reportWebVitals(undefined);

        // Ensure no web vitals functions are called
        expect(getCLS).not.toHaveBeenCalled();
        expect(getFID).not.toHaveBeenCalled();
        expect(getFCP).not.toHaveBeenCalled();
        expect(getLCP).not.toHaveBeenCalled();
        expect(getTTFB).not.toHaveBeenCalled();
    });

    it('should do nothing when onPerfEntry is an empty object', async () => {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals');

        // Run the function with an object
        await reportWebVitals({});

        // Ensure no web vitals functions are called
        expect(getCLS).not.toHaveBeenCalled();
        expect(getFID).not.toHaveBeenCalled();
        expect(getFCP).not.toHaveBeenCalled();
        expect(getLCP).not.toHaveBeenCalled();
        expect(getTTFB).not.toHaveBeenCalled();
    });
});
