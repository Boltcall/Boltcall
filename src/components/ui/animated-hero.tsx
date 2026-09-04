// /components/ui/animated-hero.tsx

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";



function Hero() {

  const [titleNumber, setTitleNumber] = useState(1);

  const titles = useMemo(

    () => ["CALL", "LEAD", "TEXT", "REVIEW", "REPLY"],

    []

  );



  useEffect(() => {

    const timeoutId = setTimeout(() => {

      if (titleNumber === titles.length - 1) {

        setTitleNumber(0);

      } else {

        setTitleNumber(titleNumber + 1);

      }

    }, 2000);

    return () => clearTimeout(timeoutId);

  }, [titleNumber, titles]);



  return (

    <div className="w-full">

      <div className="container mx-auto">

        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">

          <div className="flex gap-4 flex-col items-start w-full">

            {/* Semantic H1 for search engines + screen readers. Rendered
                off-screen; the animated visual title below is decorative
                (aria-hidden). Prior to 2026-08-29 the animated H1 was the
                only H1 on the page and rendered as "NEVER MISSA CALLCALL"
                (concatenated split letters + all 5 rotating words) in
                prerendered HTML — an unreadable ranking signal per audit. */}
            <h1 className="sr-only">
              Speed-to-lead software for law firms. Answer every intake call, book every consultation, win every retainer.
            </h1>

            <div aria-hidden="true" className="text-3xl md:text-5xl lg:text-6xl max-w-4xl tracking-tighter font-bold text-text-main flex items-center justify-start gap-2 ml-4 md:ml-8 flex-nowrap">

              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.625, delay: 0.2, ease: "easeOut" }}
              >
                NEVER
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.625, delay: 0.3, ease: "easeOut" }}
              >
                MISS
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.625, delay: 0.4, ease: "easeOut" }}
              >
                A
              </motion.span>

              <span className="relative inline-flex items-center justify-start overflow-hidden min-w-[240px] md:min-w-[380px] h-[1.2em] ml-[2px]">

                {titles.map((title, index) => (

                  <motion.span

                    key={index}

                    className="absolute text-3xl md:text-5xl lg:text-6xl font-bold text-blue-600 whitespace-nowrap"

                    initial={{ opacity: 0, y: "-100" }}

                    transition={{ type: "spring", stiffness: 50 }}

                    animate={

                      titleNumber === index

                        ? {

                            y: 0,

                            opacity: 1,

                          }

                        : {

                            y: titleNumber > index ? -150 : 150,

                            opacity: 0,

                          }

                    }

                  >

                    {title}

                  </motion.span>

                ))}

              </span>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}



export { Hero };
