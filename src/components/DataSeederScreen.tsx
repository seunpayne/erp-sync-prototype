import React, { useState } from 'react';

interface Props {
  productCount: number;
  transactionCount: number;
  onSeedProducts: (count: number) => Promise<void>;
  onSeedTransactions: (count: number) => Promise<void>;
}

export const DataSeederScreen: React.FC<Props> = ({
  productCount,
  transactionCount,
  onSeedProducts,
  onSeedTransactions,
}) => {
  const [seeding, setSeeding] = useState(false);

  const handleSeedProducts = async () => {
    setSeeding(true);
    await onSeedProducts(50);
    setSeeding(false);
  };

  const handleSeedTransactions = async () => {
    setSeeding(true);
    await onSeedTransactions(100);
    setSeeding(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Data Seeder</h2>
      
      <div style={styles.stats}>
        <div>Products: <strong>{productCount}</strong></div>
        <div>Transactions: <strong>{transactionCount}</strong></div>
      </div>

      <div style={styles.buttons}>
        <button
          style={styles.button}
          onClick={handleSeedProducts}
          disabled={seeding}
        >
          Seed 50 Products
        </button>
        <button
          style={styles.button}
          onClick={handleSeedTransactions}
          disabled={seeding}
        >
          Seed 100 Transactions
        </button>
      </div>

      {seeding && <div style={styles.status}>Seeding...</div>}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', marginTop: 0 },
  stats: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '16px' },
  buttons: { display: 'flex', flexDirection: 'column', gap: '15px' },
  button: { padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' },
  status: { marginTop: '10px', fontStyle: 'italic', color: '#666' },
};
