import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon }: any) => (
    <motion.div
        whileHover={{ y: -2 }}
        className="card"
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div className="card-title">{title}</div>
                <div className="card-value" style={{ marginBottom: '0.25rem' }}>{value}</div>
            </div>
            <div style={{ color: 'var(--muted-foreground)' }}>
                <Icon size={16} strokeWidth={1.5} />
            </div>
        </div>
    </motion.div>
);

export default StatCard;
