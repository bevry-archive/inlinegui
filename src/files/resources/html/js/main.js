$(document).ready(function() {
  $('.add-new-button').click(function(){
    $('#add-new').toggleClass('open');
  });
  $('#searchform .icon-search').click(function(){
    if (!$('#search').hasClass('open')) {
      $('#search').addClass('open');
    }
  });
  $('#skip-to-content').click(function(e) {
    e.preventDefault();
    var pos = 0;
    if ($(this).hasClass('icon-up')) {
      $("html, body").animate({ scrollTop: pos }, 400, 'swing', function() {
        $('#skip-to-content').removeClass('icon-up').addClass('icon-down');
      });
    }
    else {
      pos = $('#site').offset().top - $('#saasy-menu').height();
      $("html, body").animate({ scrollTop: pos }, 400, 'swing', function() {
        $('#skip-to-content').removeClass('icon-down').addClass('icon-up');
      });
    }
    
  
  });
});