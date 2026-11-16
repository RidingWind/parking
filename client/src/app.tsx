import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/Home/HomePage';
import ListPage from './pages/List/ListPage';
import NearbyPage from './pages/Nearby/NearbyPage';
import RegisterPage from './pages/Register/RegisterPage';
import MinePage from './pages/Mine/MinePage';
import DetailPage from './pages/Detail/DetailPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="nearby" element={<NearbyPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="mine" element={<MinePage />} />
        <Route path="detail/:id" element={<DetailPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
