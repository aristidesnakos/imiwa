import { redirect } from 'next/navigation';

export default function LearnedKanjiRedirect() {
  redirect('/kanji/progress');
}
