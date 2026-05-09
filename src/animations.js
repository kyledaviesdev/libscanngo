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