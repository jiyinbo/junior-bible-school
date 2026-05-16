import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import App from './App';

dayjs.locale('en-gb');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LocalizationProvider>
  </StrictMode>,
);
