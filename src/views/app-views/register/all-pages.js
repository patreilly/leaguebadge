import React, { useState } from "react";
import { Page, Document, pdfjs } from "react-pdf";
// import { Page, Document } from 'react-pdf/dist/esm/entry.webpack';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const options = {
    // cMapUrl: 'cmaps/',
    // cMapPacked: true,
    // workerSrc: "/pdf.worker.js"
  };
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function AllPages(props) {
    // console.log(props.pdf)
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState(props.pdf);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }
    
    function onDocumentLoadSuccess({ numPages: nextNumPages }) {
    setNumPages(nextNumPages);
    }

    // console.log(pdf)
    // const tempPdf = 'https://playerphotos-2349308230201-dev.s3.us-west-2.amazonaws.com/public/agreements/OJ8EBA/OJ8EBA-N8G/1619793281740.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAUNYFW6WPWHYJAQHU%2F20210430%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20210430T155359Z&X-Amz-Expires=900&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBgaCXVzLXdlc3QtMiJHMEUCIQDAds5GqHOLY6GuoV1qlRWJHE65lJZHEh%2BFv3c6fa5u4wIgGink5rc8wAlgpKHoex78NCPTTQM7WOl4bC85kvG9hiEqzQQIkf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgwzMDQ0MTc3OTc1MzUiDCNYDeFRwPd0jWyBfSqhBPZdD32ZqLQidkk%2Fr1vPmj7iROq%2BIL%2BWBh7FnCRJwSopNwa%2F%2BFLvICaObuC325biuhKXlCgMDKghYFqdcE%2FxEeoiLfl9WrHPRPGC7y6yHcbTuTZCi6wF5b3D%2FBnPXo9io6kSHvD5Y94SVmeXkiGLyDKTouYtOxy6L%2B%2BuLrgeBQsjiDXjdBunvgYzIaa6XEM6sB6Wv%2FtNAce43zv6xyeREYn9hdg%2B7p3BLnfPo6LrP2wDTFprA16CbhH0YlTW%2FkvQIL%2F48o2zohpFYmLvizDtbxsfpiODoXmok91ZU3E%2BpnoLr%2FNl5AtXouwlLa4MJj6HrSGZwt8vyooM1xDZgyhGhL0r%2BMkXD5uX4wP8a0%2Fg6aMSmOBNU8lU8Csg%2BVaaLQZV8xrxbMn0cyVX%2FDzpuVJmEbXa%2Fg4zh1NQHH0QEdM50E5QPjEoRolCOUF2gGeNQbRhZM7%2FSbsf2TJq9225uD4PMSdBr8ivQRsFNTUp2uBbQCPwHolmpY662%2FqgOq0AutBolcdtrk7ik7A0e4O8SbQO%2BQL5altzRfB%2BaVIY%2BHTYlxTjKjZeR3QaTtgrGqIvaMyXHXDkS5hr5MZJSQPFy8AC5Im3AkwByBQ%2F258uevxheCY1RuWlViXBWkWXe5Sq40mIfwUFBwiNSFpfjQMEKgbJ5Sty2%2Fqf7jHDQCfPAmHoCt6DDqh%2FlvIXOln2QgbemZAAUChl2lzPr3LoRtBiz5oXQIxLMOnNsIQGOoUC5EhXLFqm8mVvi0VYk03dwT%2F8fkPKdP04Z6ef%2FhP%2BF5OL4P0HNBXMpZ5allE22OyMJ1cfEOy5nYdjaCc1HOjID3LyuKOcgDmoyupz0ZvZPFKixIVhjE%2FqgIyvUCjqGmNkhKnI9rmYZYCqxRsyjya3DeImdru0%2BzuaP31bWYFii%2BF4ScbInG0M%2FJqXkAvP8Q4llq3qv9O%2F6tMfzBoYprSqwXmC50Oltjmd0vd1%2FZRci%2FYmZ7jDUlF3aHE%2B64XbxS3HVkV8HQ0e4Gm2RSY84ZtX9gTzhycP0b3eCarnpKMZWBDzpAAeGNdBesNU0BKkk9XQXz2tLRW9pC70oakYp0uQymdVM44F&X-Amz-Signature=42e74f5b61ef6fdccb3b2c854bfe8e150dfe295060effdb27762423fccb12b4a&X-Amz-SignedHeaders=host&x-amz-user-agent=aws-sdk-js%2F3.6.1%20os%2FmacOS%2F10.15.7%20lang%2Fjs%20md%2Fbrowser%2FChrome_90.0.4430.93%20api%2Fs3%2F3.6.1%20aws-amplify%2F3.8.21_js&x-id=GetObject'
    return (
        <div className="Example">
        <div className="Example__container__document">
            <Document
            file={props.pdf}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={console.error}
            // options={options}
            >
            {
                Array.from(
                new Array(numPages),
                (el, index) => (
                    <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    />
                ),
                )
            }
            </Document>
        </div>
      </div>
    );
}