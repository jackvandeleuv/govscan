// import React from 'react';
// import ReactMarkdown from 'react-markdown';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
// import { NormalComponents } from 'react-markdown/lib/complex-types';
// import { SpecialComponents } from 'react-markdown/lib/ast-to-react';
// import { CodeComponent } from 'react-markdown/lib/ast-to-react';

// interface MarkdownRendererProps {
//   content: string;
// }

// const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
//   const CodeBlock: CodeComponent = ({ inline, className, children, ...props }) => {
//     const match = /language-(\w+)/.exec(className || '');
//     return !inline && match ? (
//       <SyntaxHighlighter
//         style={okaidia}
//         language={match[1]}
//         PreTag="div"
//         {...props}
//       >
//         {String(children).replace(/\n$/, '')}
//       </SyntaxHighlighter>
//     ) : (
//       <code className={className} {...props}>
//         {children}
//       </code>
//     );
//   };

//   return (
//     <div className="markdown-container">
//       <ReactMarkdown
//         children={content}
//         components={{
//           code: CodeBlock,
//           strong: ({ node, ...props }) => <strong style={{ fontWeight: 'bold' }} {...props} />,
//         } as Partial<NormalComponents & SpecialComponents>}
//       />
//     </div>
//   );
// };

// export default MarkdownRenderer;
