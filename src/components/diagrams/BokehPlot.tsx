import { useEffect, useRef } from "react";


interface Props {
    htmlPath: string
}

export default function Diagram({ htmlPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(htmlPath)
      .then((res) => res.text())
      .then((text) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = text;

          // Execute the script manually
          const script = containerRef.current.querySelector('script');
          if (script) {
            const newScript = document.createElement('script');
            newScript.innerHTML = script.innerHTML;
            document.head.appendChild(newScript);
          }
        }
      });
  }, []);

  return (
    <div
      ref={containerRef}
      className="bokeh-container"
      style={{
        display: 'flex',
        justifyContent: 'center'
      }}
    />
  );
}



// interface Props {
//   jsonPath: string;
//   id: string;
// }

// export default function Diagram({ jsonPath, id }: Props) {
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     fetch(jsonPath)
//       .then((res) => res.json())
//       .then((item) => {
//         if (containerRef.current) {
//           embed.embed_item(item, id);
//         }
//       });
//   }, [jsonPath, id]);

//   return <div id={id} ref={containerRef} />;
// }
