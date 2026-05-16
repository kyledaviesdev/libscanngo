// This file stores all our animation "recipes" so they can be reused
export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Creates the "one-by-one" entrance effect
    },
  },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 300, damping: 25 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.2 } 
  }
};

export const hoverLift = {
  y: -5,
  transition: { duration: 0.2, ease: "easeOut" }
};

export const tapShrink = {
  scale: 0.95
};

export const iconHover = {
  scale: 1.2,
  rotate: 5
};

export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalContentVariants = {
  hidden: { y: 50, opacity: 0, scale: 0.95 },
  show: { 
    y: 0, 
    opacity: 1, 
    scale: 1, 
    transition: { type: 'spring', damping: 25, stiffness: 300 } 
  },
  exit: { 
    y: 20, 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.2 } 
  }
};