const AnimatedBackground = () => {
  return (
    <>
      {/* Premium Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0D1117] via-[#131922] to-[#161B22] -z-50">
        {/* Soft Blurred Gradient Shape 1 - Emerald */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-drift-1"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 40%, transparent 70%)',
            top: '10%',
            left: '15%',
          }}
        />

        {/* Soft Blurred Gradient Shape 2 - Soft Purple */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-drift-2"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 70%)',
            top: '50%',
            right: '10%',
          }}
        />

        {/* Soft Blurred Gradient Shape 3 - Soft Blue */}
        <div
          className="absolute w-[550px] h-[550px] rounded-full blur-[110px] animate-drift-3"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.05) 40%, transparent 70%)',
            bottom: '15%',
            left: '20%',
          }}
        />

        {/* Soft Blurred Gradient Shape 4 - Indigo */}
        <div
          className="absolute w-[450px] h-[450px] rounded-full blur-[90px] animate-drift-4"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, rgba(79, 70, 229, 0.05) 40%, transparent 70%)',
            bottom: '25%',
            right: '25%',
          }}
        />

        {/* Additional Creative Gradient Shapes */}
        {/* Soft Blurred Gradient Shape 5 - Teal */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[95px] animate-drift-5"
          style={{
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.10) 0%, rgba(13, 148, 136, 0.05) 40%, transparent 70%)',
            top: '5%',
            right: '5%',
          }}
        />

        {/* Soft Blurred Gradient Shape 6 - Cyan */}
        <div
          className="absolute w-[480px] h-[480px] rounded-full blur-[105px] animate-drift-6"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.09) 0%, rgba(8, 145, 178, 0.05) 40%, transparent 70%)',
            top: '60%',
            left: '5%',
          }}
        />

        {/* Soft Blurred Gradient Shape 7 - Slate */}
        <div
          className="absolute w-[420px] h-[420px] rounded-full blur-[100px] animate-drift-7"
          style={{
            background: 'radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, rgba(100, 116, 139, 0.04) 40%, transparent 70%)',
            bottom: '5%',
            right: '15%',
          }}
        />

        {/* Soft Blurred Gradient Shape 8 - Lavender */}
        <div
          className="absolute w-[380px] h-[380px] rounded-full blur-[85px] animate-drift-8"
          style={{
            background: 'radial-gradient(circle, rgba(196, 181, 253, 0.10) 0%, rgba(167, 139, 250, 0.05) 40%, transparent 70%)',
            top: '30%',
            left: '50%',
          }}
        />

        {/* Soft Blurred Gradient Shape 9 - Teal */}
        <div
          className="absolute w-[360px] h-[360px] rounded-full blur-[80px] animate-drift-9"
          style={{
            background: 'radial-gradient(circle, rgba(45, 212, 191, 0.09) 0%, rgba(20, 184, 166, 0.05) 40%, transparent 70%)',
            bottom: '40%',
            right: '8%',
          }}
        />

        {/* Subtle Grain/Noise Overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* Global Animations */}
      <style>{`
        @keyframes drift-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          25% {
            transform: translate(40px, -30px) scale(1.05);
            filter: hue-rotate(5deg) brightness(1.02);
          }
          50% {
            transform: translate(-20px, 40px) scale(0.95);
            filter: hue-rotate(10deg) brightness(0.98);
          }
          75% {
            transform: translate(30px, 20px) scale(1.02);
            filter: hue-rotate(5deg) brightness(1.01);
          }
        }

        @keyframes drift-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          30% {
            transform: translate(-35px, 45px) scale(1.08);
            filter: hue-rotate(-8deg) brightness(1.03);
          }
          60% {
            transform: translate(25px, -25px) scale(0.92);
            filter: hue-rotate(-12deg) brightness(0.97);
          }
          80% {
            transform: translate(-15px, 30px) scale(1.05);
            filter: hue-rotate(-6deg) brightness(1.01);
          }
        }

        @keyframes drift-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          20% {
            transform: translate(30px, 35px) scale(0.96);
            filter: hue-rotate(7deg) brightness(0.98);
          }
          55% {
            transform: translate(-40px, -20px) scale(1.06);
            filter: hue-rotate(12deg) brightness(1.02);
          }
          85% {
            transform: translate(20px, -35px) scale(1.01);
            filter: hue-rotate(4deg) brightness(1);
          }
        }

        @keyframes drift-4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          35% {
            transform: translate(-25px, -40px) scale(1.04);
            filter: hue-rotate(-10deg) brightness(1.01);
          }
          65% {
            transform: translate(35px, 30px) scale(0.98);
            filter: hue-rotate(-15deg) brightness(0.99);
          }
          90% {
            transform: translate(-30px, 15px) scale(1.02);
            filter: hue-rotate(-5deg) brightness(1);
          }
        }

        @keyframes drift-5 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          40% {
            transform: translate(35px, 40px) scale(1.06);
            filter: hue-rotate(8deg) brightness(1.02);
          }
          70% {
            transform: translate(-30px, -15px) scale(0.94);
            filter: hue-rotate(12deg) brightness(0.98);
          }
        }

        @keyframes drift-6 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          25% {
            transform: translate(-40px, 20px) scale(1.07);
            filter: hue-rotate(-6deg) brightness(1.03);
          }
          65% {
            transform: translate(30px, -35px) scale(0.93);
            filter: hue-rotate(-11deg) brightness(0.97);
          }
        }

        @keyframes drift-7 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          33% {
            transform: translate(25px, -35px) scale(1.05);
            filter: hue-rotate(9deg) brightness(1.02);
          }
          66% {
            transform: translate(-35px, 25px) scale(0.96);
            filter: hue-rotate(13deg) brightness(0.98);
          }
        }

        @keyframes drift-8 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          28% {
            transform: translate(-30px, -30px) scale(1.04);
            filter: hue-rotate(-7deg) brightness(1.01);
          }
          58% {
            transform: translate(40px, 20px) scale(0.97);
            filter: hue-rotate(-10deg) brightness(0.99);
          }
        }

        @keyframes drift-9 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: hue-rotate(0deg) brightness(1);
          }
          32% {
            transform: translate(35px, -25px) scale(1.06);
            filter: hue-rotate(6deg) brightness(1.02);
          }
          64% {
            transform: translate(-25px, 35px) scale(0.95);
            filter: hue-rotate(11deg) brightness(0.98);
          }
        }

        .animate-drift-1 {
          animation: drift-1 24s ease-in-out infinite;
        }

        .animate-drift-2 {
          animation: drift-2 28s ease-in-out infinite;
        }

        .animate-drift-3 {
          animation: drift-3 20s ease-in-out infinite;
        }

        .animate-drift-4 {
          animation: drift-4 26s ease-in-out infinite;
        }

        .animate-drift-5 {
          animation: drift-5 22s ease-in-out infinite;
        }

        .animate-drift-6 {
          animation: drift-6 30s ease-in-out infinite;
        }

        .animate-drift-7 {
          animation: drift-7 25s ease-in-out infinite;
        }

        .animate-drift-8 {
          animation: drift-8 27s ease-in-out infinite;
        }

        .animate-drift-9 {
          animation: drift-9 23s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-drift-1,
          .animate-drift-2,
          .animate-drift-3,
          .animate-drift-4,
          .animate-drift-5,
          .animate-drift-6,
          .animate-drift-7,
          .animate-drift-8,
          .animate-drift-9 {
            animation: none;
          }
        }
      `}</style>
    </>
  );
};

export default AnimatedBackground;