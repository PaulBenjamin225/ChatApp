import React from 'react';

const ComingSoonPage = ({ pageName }) => (
    <div style={{ padding: '50px', color: 'white', gridColumn: '2 / span 3' }}>
        <h1>{pageName || 'Bientôt Disponible'}</h1>
        <p>Cette fonctionnalité est en cours de développement.</p>
    </div>
);

export default ComingSoonPage;