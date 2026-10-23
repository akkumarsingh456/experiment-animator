import type {ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
/** Source management is closed for everyone, including previously authorised accounts. */
export function LibraryAccessGate({children:_children}:{children:ReactNode}){
 return <main className="library-access-panel"><h1>Book library is protected</h1><p>New uploads, deletion and changes to existing source books are disabled. You can continue reading uploaded books and preparing lessons.</p><p><Link to="/history">Browse uploaded books</Link> · <Link to="/">Prepare a lesson</Link> · <Link to="/workspace">Teacher workspace</Link></p></main>;
}
