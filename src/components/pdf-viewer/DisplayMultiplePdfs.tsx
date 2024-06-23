import { ViewPdf } from "~/components/pdf-viewer/ViewPdf";
import { useMultiplePdfs } from "../../hooks/useMultiplePdfs";
import { Document } from "~/types/document";
import cx from "classnames";
import { borderColors } from "~/utils/colors";

interface DisplayMultiplePdfsProps {
  pdfs: Document[];
}

export const DisplayMultiplePdfs: React.FC<DisplayMultiplePdfsProps> = ({
  pdfs,
}) => {
  const { isActivePdf, handlePdfFocus } = useMultiplePdfs(pdfs);

  return (
    <>
      <div className="flex h-full items-start justify-center ">
        {pdfs.map((file) => {
          return (
            <div
              key={`viewing-${file.id}`}
              className={cx({ hidden: !isActivePdf(file) })}
            >
              <ViewPdf file={file} />
            </div>
          );
        })}
        <div className="flex h-full w-[80px] flex-col">
          <div className="flex h-[43px] w-[80px] items-center justify-center border-b border-l font-bold text-gray-90 "></div>
          {pdfs.map((file, index) => (
            <div key={index}>
              <button
                onClick={() => handlePdfFocus(file)}
                className={`group flex h-[60px] w-[80px] items-end  justify-start border px-2 py-1 font-nunito text-sm font-bold ${
                  isActivePdf(file)
                    ? "border-l-0 bg-gray-pdf"
                    : "bg-white font-light text-gray-60 "
                }`}
              >
                <div
                  className={`flex flex-col items-start justify-start ${
                    file.color ? borderColors[file.color] : ''
                  } ${
                    !isActivePdf(file)
                      ? "group-hover:border-l-4 group-hover:pl-1 group-hover:font-bold group-hover:text-gray-90"
                      : ""
                  }`}
                >
                  <div>{`${file.geography.split(',')[0]!}`}</div>
                </div>
              </button>
            </div>
          ))}
          <div className="h-[60px] w-[80px] flex-grow overflow-hidden border-l"></div>
        </div>
      </div>
    </>
  );
};

export default DisplayMultiplePdfs;
