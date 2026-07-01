import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function VerdictStamp({ isFlagged, isVerified }) {
  const shouldReduceMotion = useReducedMotion();

  if (!isFlagged && !isVerified) return null;

  const text = isFlagged ? 'FLAGGED' : 'VERIFIED';
  const typeClass = isFlagged ? 'flagged' : 'verified';

  // Animation variants
  const getVariants = () => {
    if (shouldReduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 0.85, transition: { duration: 0.3 } }
      };
    }

    if (isFlagged) {
      // Flagged: Slam animation (scale 1.4 -> 1.0 + slight rotate settle)
      return {
        initial: { opacity: 0, scale: 1.4, rotate: -25 },
        animate: { 
          opacity: 0.85, 
          scale: 1, 
          rotate: -8,
          transition: { 
            type: 'spring',
            damping: 12,
            stiffness: 150,
            duration: 0.25
          } 
        }
      };
    } else {
      // Verified: Quiet fade animation
      return {
        initial: { opacity: 0, scale: 0.95, rotate: -8 },
        animate: { 
          opacity: 0.85, 
          scale: 1, 
          transition: { duration: 0.3 } 
        }
      };
    }
  };

  return (
    <motion.div
      variants={getVariants()}
      initial="initial"
      animate="animate"
      className={`verdict-stamp ${typeClass}`}
      style={{
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '0px',
        display: 'inline-block',
        fontSize: '11px',
        padding: '3px 8px',
        lineHeight: 1,
        boxShadow: isFlagged ? '0 0 10px rgba(162, 62, 50, 0.05)' : 'none'
      }}
    >
      {text}
    </motion.div>
  );
}
