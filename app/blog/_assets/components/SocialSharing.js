'use client';

import { FacebookShareButton, TwitterShareButton, WhatsappShareButton } from 'react-share';
import { FaFacebook, FaTwitter, FaWhatsapp } from 'react-icons/fa';

function SocialSharing({ url, title }) {
  return (
    <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
      <FacebookShareButton url={url} quote={title}>
        <div className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200">
          <FaFacebook className="text-xl" />
          <span>Share</span>
        </div>
      </FacebookShareButton>
      <TwitterShareButton url={url} title={title}>
        <div className="flex items-center space-x-2 bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors duration-200">
          <FaTwitter className="text-xl" />
          <span>Share</span>
        </div>
      </TwitterShareButton>
      <WhatsappShareButton url={url} title={title}>
        <div className="flex items-center space-x-2 bg-green-400 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors duration-200">
          <FaWhatsapp className="text-xl" />
          <span>Share</span>
        </div>
      </WhatsappShareButton>
    </div>
  );
}

export default SocialSharing;
