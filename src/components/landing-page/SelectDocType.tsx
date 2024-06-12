import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import type { DocumentType } from "~/types/document";
import { useCombobox } from "downshift";
import cx from "classnames";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import useFocus from "~/hooks/utils/useFocus";

function getDocTypeFilter(inputValue: string) {
  const lowerCasedInputValue = inputValue.toLowerCase();

  return function docTypeFilter(docType: DocumentType) {
    return (
      !inputValue ||
      docType.fullName.toLowerCase().includes(lowerCasedInputValue) ||
      docType.docType.toLowerCase().includes(lowerCasedInputValue)
    );
  };
}

interface DocumentSelectComboboxProps {
  selectedItem: DocumentType | null;
  setSelectedItem: (docType: DocumentType) => void;
  availableDocuments: DocumentType[];
  shouldFocusItem: boolean;
  setFocusState: Dispatch<SetStateAction<boolean>>;
}

export const DocumentSelectCombobox: React.FC<DocumentSelectComboboxProps> = ({
  selectedItem,
  availableDocuments,
  setSelectedItem,
  shouldFocusItem,
  setFocusState,
}) => {
  const [focusRef, setFocus] = useFocus<HTMLInputElement>();

  useEffect(() => {
    if (shouldFocusItem) {
      setInputValue("");
      setFocus();
      setFocusState(false);
    }
  }, [shouldFocusItem]);

  const [filteredDocuments, setFilteredDocuments] =
    useState<DocumentType[]>(availableDocuments);

  useEffect(() => {
    setFilteredDocuments(availableDocuments);
  }, [availableDocuments]);

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    setInputValue,
  } = useCombobox({
    onInputValueChange({ inputValue }) {
      if (inputValue) {
        setFilteredDocuments(
          availableDocuments.filter(getDocTypeFilter(inputValue))
        );
      } else {
        setFilteredDocuments(availableDocuments);
      }
    },
    items: filteredDocuments,
    itemToString(item) {
      return item ? item.fullName : "";
    },
    selectedItem,
    onSelectedItemChange: ({ selectedItem: newSelectedItem }) => {
      if (newSelectedItem) {
        setSelectedItem(newSelectedItem);
      }
    },
  });
  return (
    <div className="flex-grow">
      <div className="flex flex-col gap-1 rounded-s bg-[#F7F7F7]">
        <div className="flex items-center justify-center gap-0.5 shadow-sm">
          <div className="ml-2">
            <HiOutlineBuildingOffice2 size={20} />
          </div>
          <input
            placeholder="Select Document Type"
            className="align-center mt-[5px] w-full p-1.5 focus:outline-none "
            {...getInputProps({ ref: focusRef })}
            style={{ backgroundColor: "#F7F7F7" }}
          />
        </div>
      </div>
      <ul
        className={`absolute z-20 mt-1 max-h-72 w-72 overflow-scroll bg-white p-0 shadow-md ${
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          !(isOpen && filteredDocuments.length) && "hidden"
        }`}
        {...getMenuProps()}
      >
        {isOpen &&
          filteredDocuments.map((item, index) => (
            <li
              className={cx(
                highlightedIndex === index && "bg-[#818BE7] text-white",
                selectedItem === item && "font-bold",
                "z-20 flex flex-col px-3 py-2 shadow-sm"
              )}
              key={`${item.fullName}${index}`}
              {...getItemProps({ item, index })}
            >
              <span>{item.fullName}</span>
            </li>
          ))}
      </ul>
    </div>
  );
};
