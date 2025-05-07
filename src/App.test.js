import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock each page component to identify it by text
jest.mock('./pages/Home', () => () => <div>Home Page</div>);
jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Signup', () => () => <div>Signup Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('./pages/TaskInput', () => () => <div>Task Input Page</div>);
jest.mock('./pages/ForgotPassword', () => () => <div>Forgot Password Page</div>);

const renderWithRoute = (initialRoute) => {
    render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <App />
        </MemoryRouter>
    );
};

test('renders Home component for "/" route', () => {
    renderWithRoute('/');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
});

test('renders Login component for "/login" route', () => {
    renderWithRoute('/login');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
});

test('renders Signup component for "/signup" route', () => {
    renderWithRoute('/signup');
    expect(screen.getByText('Signup Page')).toBeInTheDocument();
});

test('renders Dashboard component for "/dashboard" route', () => {
    renderWithRoute('/dashboard');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
});

test('renders TaskInput component for "/add-task" route', () => {
    renderWithRoute('/add-task');
    expect(screen.getByText('Task Input Page')).toBeInTheDocument();
});

test('renders ForgotPassword component for "/forgot-password" route', () => {
    renderWithRoute('/forgot-password');
    expect(screen.getByText('Forgot Password Page')).toBeInTheDocument();
});