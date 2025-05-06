import React from 'react';
import * as ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import App from './App';

// Create a mock root DOM node
document.body.innerHTML = '<div id="root"></div>';

// Mock ReactDOM.createRoot and its render method
const renderMock = jest.fn();
ReactDOM.createRoot = jest.fn(() => ({
    render: renderMock,
}));

jest.mock('./App', () => () => <div>Mock App</div>);
jest.mock('./reportWebVitals', () => jest.fn());

test('renders without crashing and calls reportWebVitals', () => {
    require('./index');

    expect(ReactDOM.createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalled();
    expect(reportWebVitals).toHaveBeenCalled();
});
